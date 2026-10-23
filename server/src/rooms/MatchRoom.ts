/**
 * Một trận đấu: draft → ban → battle → result.
 *
 * Server authoritative: mọi hành động đi qua `handle()`, mọi timeout qua `tick()`.
 * Không tự tạo timer bên trong → test có thể điều khiển đồng hồ giả.
 */
import {
  CONFIG,
  applyBan,
  applyPick,
  autoBan,
  autoPick,
  chooseAction,
  createBattle,
  createDraft,
  finalTeams,
  heroDef,
  mulberry32,
  otherSide,
  playTurn,
} from '@prism-pact/shared';
import type {
  Archetype,
  BattleState,
  ClientMessage,
  DraftState,
  ErrorCode,
  MatchView,
  RankView,
  Rng,
  ServerMessage,
  Side,
  Timings,
  TurnAnimation,
} from '@prism-pact/shared';
import type { ChainClient } from '../chain.js';
import { buildDraftHash } from '../chain.js';
import type { RankingStore } from '../ranking.js';

export interface Player {
  id: string;
  name: string;
  side: Side;
  isBot: boolean;
  send(message: ServerMessage): void;
}

export interface MatchRoomOptions {
  mode?: 'pvp' | 'bot';
  now?: () => number;
  rng?: Rng;
  timings?: Partial<Timings>;
  ranking?: RankingStore;
  chain?: ChainClient | null;
  onFinished?: (room: MatchRoom) => void;
}

const DEFAULT_TIMINGS: Timings = {
  pickMs: CONFIG.DRAFT_PICK_TIME_MS,
  banMs: CONFIG.DRAFT_BAN_TIME_MS,
  turnMs: CONFIG.TURN_TIME_MS,
  botDelayMs: 800,
  disconnectGraceMs: CONFIG.RECONNECT_GRACE_MS,
};

type PendingAction = {
  skill: { casterUid: string; targetUid?: string } | null;
  targetUid: string | null;
};

export class MatchRoom {
  readonly timings: Timings;

  private readonly now: () => number;
  private readonly rng: Rng;
  private readonly ranking?: RankingStore;
  private readonly chain: ChainClient | null;
  private readonly onFinished?: (room: MatchRoom) => void;
  private readonly botSide: Side | null;
  private readonly matchSalt: string;

  private draft: DraftState;
  private battle: BattleState | null = null;
  private phase: MatchView['phase'] = 'draft';
  private winner: Side | 'draw' | null = null;
  private deadline: number | null = null;
  private botActAt = 0;
  private pending: PendingAction = { skill: null, targetUid: null };
  private ranks: Partial<Record<Side, RankView>> = {};
  private disconnected: { side: Side; at: number } | null = null;
  private finished = false;

  constructor(
    readonly id: string,
    readonly players: [Player, Player],
    options: MatchRoomOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.rng = options.rng ?? mulberry32(Date.now() & 0xffffffff);
    this.timings = { ...DEFAULT_TIMINGS, ...(options.timings ?? {}) };
    this.ranking = options.ranking;
    this.chain = options.chain ?? null;
    this.onFinished = options.onFinished;
    this.botSide = players.find((p) => p.isBot)?.side ?? null;
    this.matchSalt = Math.random().toString(16).slice(2).padEnd(16, '0');

    const firstPick: Side = this.rng() < 0.5 ? 'P1' : 'P2';
    this.draft = createDraft(firstPick);
  }

  // ── Vòng đời ─────────────────────────────────────────────────────────

  start(): void {
    this.phase = 'draft';
    this.deadline = this.now() + this.timings.pickMs;
    this.scheduleBot();
    this.broadcast(['Trận đấu bắt đầu — draft live 2-2']);
  }

  dispose(): void {
    this.finished = true;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get currentPhase(): MatchView['phase'] {
    return this.phase;
  }

  // ── Tick: timeout + bot ──────────────────────────────────────────────

  tick(): void {
    if (this.finished) return;
    const now = this.now();

    if (this.disconnected && now >= this.disconnected.at + this.timings.disconnectGraceMs) {
      const loser = this.disconnected.side;
      this.finish(otherSide(loser), `${loser} mất kết nối quá ${Math.round(this.timings.disconnectGraceMs / 1000)}s`);
      return;
    }

    if (this.phase === 'draft') {
      if (this.botSide && this.draft.turn === this.botSide && now >= this.botActAt) {
        this.botDraftPick();
        return;
      }
      if (this.deadline !== null && now >= this.deadline) this.timeoutDraft();
      return;
    }

    if (this.phase === 'ban') {
      if (this.botSide && this.draft.pendingBan[this.botSide] === null) {
        this.botBan();
        return;
      }
      if (this.deadline !== null && now >= this.deadline) this.timeoutBan();
      return;
    }

    if (this.phase === 'battle' && this.battle) {
      if (this.battle.winner !== null) {
        this.finish(this.battle.winner);
        return;
      }
      if (this.botSide && this.battle.active === this.botSide && now >= this.botActAt) {
        this.botBattleAction();
        return;
      }
      if (this.deadline !== null && now >= this.deadline) this.timeoutBattle();
    }
  }

  // ── Message từ client ────────────────────────────────────────────────

  handle(side: Side, msg: ClientMessage): void {
    if (this.finished) return;

    switch (msg.t) {
      case 'pick':
        this.humanPick(side, msg.hero);
        return;
      case 'ban':
        this.humanBan(side, msg.hero);
        return;
      case 'skill':
        this.pending.skill = { casterUid: msg.casterUid, targetUid: msg.targetUid };
        return;
      case 'target':
        this.pending.targetUid = msg.targetUid;
        return;
      case 'swap':
        this.humanSwap(side, msg.from, msg.to);
        return;
      default:
        this.sendError(side, 'BAD_PHASE', `Không xử lý message "${msg.t}"`);
    }
  }

  playerLeft(side: Side): void {
    if (this.finished) return;
    this.disconnected = { side, at: this.now() };
    this.broadcast([`${side} mất kết nối — chờ ${Math.round(this.timings.disconnectGraceMs / 1000)}s`]);
  }

  playerRejoin(side: Side): void {
    if (this.disconnected?.side === side) {
      this.disconnected = null;
      this.broadcast([`${side} đã kết nối lại`]);
    }
  }

  // ── Draft ────────────────────────────────────────────────────────────

  private humanPick(side: Side, hero: Archetype): void {
    if (this.phase !== 'draft') {
      this.sendError(side, 'BAD_PHASE', 'Không phải giai đoạn draft');
      return;
    }
    if (this.draft.turn !== side) {
      this.sendError(side, 'NOT_YOUR_TURN', 'Chưa tới lượt pick của bạn');
      return;
    }
    if (!applyPick(this.draft, side, hero)) {
      this.sendError(side, 'ILLEGAL_MOVE', `Không thể pick ${hero}`);
      return;
    }
    this.afterPick(`${side} pick ${hero}`);
  }

  private afterPick(event: string): void {
    if (this.draft.phase === 'ban') {
      this.startBan([event]);
      return;
    }
    this.deadline = this.now() + this.timings.pickMs;
    this.scheduleBot();
    this.broadcast([event]);
  }

  private botDraftPick(): void {
    const hero = autoPick(this.draft, this.rng);
    this.afterPick(hero ? `Bot pick ${hero}` : 'Bot không còn tướng để pick');
  }

  private timeoutDraft(): void {
    const side = this.draft.turn;
    const hero = autoPick(this.draft, this.rng);
    this.afterPick(hero ? `${side} hết giờ → auto-pick ${hero}` : `${side} hết giờ`);
  }

  private startBan(events: string[]): void {
    this.phase = 'ban';
    this.deadline = this.now() + this.timings.banMs;
    this.broadcast([...events, 'Ban: mỗi bên chọn 1 tướng của đối thủ (ẩn)']);
  }

  private humanBan(side: Side, hero: Archetype): void {
    if (this.phase !== 'ban') {
      this.sendError(side, 'BAD_PHASE', 'Không phải giai đoạn ban');
      return;
    }
    if (!applyBan(this.draft, side, hero)) {
      this.sendError(side, 'ILLEGAL_MOVE', `Không thể ban ${hero}`);
      return;
    }
    this.afterBan();
  }

  private afterBan(): void {
    if (this.draft.phase === 'done') {
      this.startBattle();
      return;
    }
    this.broadcast(['Đã ghi nhận ban — chờ đối thủ']);
  }

  private botBan(): void {
    if (!this.botSide) return;
    const hero = autoBan(this.draft, this.botSide, this.rng);
    if (hero) this.afterBan();
  }

  private timeoutBan(): void {
    const events: string[] = [];
    for (const side of ['P1', 'P2'] as Side[]) {
      if (this.draft.pendingBan[side] !== null) continue;
      const hero = autoBan(this.draft, side, this.rng);
      if (hero) events.push(`${side} hết giờ → auto-ban ${hero}`);
    }
    if (this.draft.phase === 'done') this.startBattle(events);
    else this.broadcast(events);
  }

  // ── Battle ───────────────────────────────────────────────────────────

  private startBattle(events: string[] = []): void {
    const teams = finalTeams(this.draft);
    this.battle = createBattle(
      teams.P1 as [Archetype, Archetype, Archetype],
      teams.P2 as [Archetype, Archetype, Archetype],
      this.rng,
    );
    this.phase = 'battle';
    this.deadline = this.now() + this.timings.turnMs;
    this.scheduleBot();
    this.commitDraft();
    this.broadcast([...events, 'Đội hình chốt: 3v3 — trận đấu bắt đầu']);
  }

  private humanSwap(side: Side, from: number, to: number): void {
    if (this.phase !== 'battle' || !this.battle) {
      this.sendError(side, 'BAD_PHASE', 'Chưa vào trận');
      return;
    }
    if (this.battle.active !== side) {
      this.sendError(side, 'NOT_YOUR_TURN', 'Chưa tới lượt của bạn');
      return;
    }

    const report = playTurn(
      this.battle,
      { swap: [from, to], targetUid: this.pending.targetUid, skill: this.pending.skill ?? undefined },
      this.rng,
    );

    this.pending = { skill: null, targetUid: null };
    this.deadline = this.now() + this.timings.turnMs;
    this.scheduleBot();

    // Sudden Death có thể kết thúc trận ngay trong lượt này (accepted = true, không có swap).
    if (this.battle.winner !== null) {
      this.finish(this.battle.winner, report.logs.join(' · '));
      return;
    }
    if (!report.accepted) {
      this.sendError(side, 'ILLEGAL_MOVE', `Nước đi không hợp lệ (${report.reason ?? 'UNKNOWN'})`);
      return;
    }
    this.broadcast(report.logs, report.animation ?? undefined);
  }

  private botBattleAction(): void {
    if (!this.battle) return;
    const action = chooseAction(this.battle, this.rng);
    if (!action) {
      this.timeoutBattle();
      return;
    }
    const report = playTurn(this.battle, action, this.rng);
    if (!report.accepted) {
      this.timeoutBattle();
      return;
    }
    this.deadline = this.now() + this.timings.turnMs;
    this.scheduleBot();
    if (this.battle.winner !== null) {
      this.finish(this.battle.winner, report.logs.join(' · '));
      return;
    }
    this.broadcast([`Bot: ${report.logs.join(' · ')}`], report.animation ?? undefined);
  }

  private timeoutBattle(): void {
    if (!this.battle) return;
    const side = this.battle.active;
    const action = chooseAction(this.battle, this.rng);
    if (!action) {
      this.finish('draw', 'Không còn nước đi — hoà');
      return;
    }
    const report = playTurn(this.battle, action, this.rng);
    if (!report.accepted) {
      this.finish('draw', 'Không thể resolve lượt — hoà');
      return;
    }
    this.deadline = this.now() + this.timings.turnMs;
    this.scheduleBot();
    if (this.battle.winner !== null) {
      this.finish(this.battle.winner, report.logs.join(' · '));
      return;
    }
    this.broadcast([`${side} hết giờ → auto-play`], report.animation ?? undefined);
  }

  // ── Kết thúc ─────────────────────────────────────────────────────────

  private finish(winner: Side | 'draw', reason?: string): void {
    if (this.finished) return;
    this.finished = true;
    this.phase = 'result';
    this.winner = winner;
    this.deadline = null;

    for (const player of this.players) {
      if (player.isBot) continue;
      const outcome = winner === 'draw' ? 'draw' : winner === player.side ? 'win' : 'lose';
      const rank = this.ranking ? this.ranking.apply(player.id, outcome) : { points: 0, delta: 0 };
      this.ranks[player.side] = rank;
      player.send({ t: 'end', winner, rank });
    }

    const text = winner === 'draw' ? 'Hoà' : `${winner} thắng`;
    this.broadcast([reason ? `${text} — ${reason}` : text]);
    this.onFinished?.(this);
  }

  /** Fire-and-forget: không block gameplay nếu Fuji chậm/lỗi. */
  private commitDraft(): void {
    if (!this.chain) return;
    const hash = buildDraftHash({
      matchId: this.id,
      p1: this.draft.picks.P1,
      p2: this.draft.picks.P2,
      p1Ban: this.draft.bans.P1[0] ?? null,
      p2Ban: this.draft.bans.P2[0] ?? null,
      salt: this.matchSalt,
    });
    this.chain
      .commitDraft(this.id, hash)
      .then((tx) => {
        if (tx) this.broadcast([`Draft hash on-chain: ${tx.slice(0, 10)}…`]);
      })
      .catch((error: unknown) => {
        this.broadcast([`Commit draft lỗi: ${(error as Error).message}`]);
      });
  }

  // ── View ─────────────────────────────────────────────────────────────

  viewFor(side: Side): MatchView {
    return {
      matchId: this.id,
      mode: this.botSide ? 'bot' : 'pvp',
      you: side,
      phase: this.phase,
      deadline: this.deadline,
      draft: this.draftView(side),
      battle: this.battle ? this.battleView() : null,
      winner: this.winner,
      ...(this.ranks[side] ? { rank: this.ranks[side] } : {}),
    };
  }

  private draftView(side: Side) {
    const revealBans = this.draft.phase === 'done';
    return {
      phase: this.draft.phase,
      round: this.draft.round,
      pool: [...this.draft.pool],
      picks: { P1: [...this.draft.picks.P1], P2: [...this.draft.picks.P2] },
      bans: revealBans
        ? { P1: [...this.draft.bans.P1], P2: [...this.draft.bans.P2] }
        : { P1: [] as Archetype[], P2: [] as Archetype[] },
      turn: this.draft.turn,
      picksLeftThisTurn: this.draft.picksLeftThisTurn,
      yourBan: this.draft.pendingBan[side],
    };
  }

  private battleView() {
    if (!this.battle) return null;
    return {
      board: this.battle.board,
      active: this.battle.active,
      turn: this.battle.turn,
      suddenDeath: this.battle.suddenDeath,
      sides: {
        P1: this.sideView(this.battle, 'P1'),
        P2: this.sideView(this.battle, 'P2'),
      },
    };
  }

  private sideView(battle: BattleState, side: Side) {
    const state = battle.sides[side];
    return {
      side,
      mana: state.mana,
      targetUid: state.targetUid,
      heroes: state.heroes.map((hero) => ({
        uid: hero.uid,
        archetype: hero.archetype,
        hp: hero.hp,
        maxHp: hero.maxHp,
        atk: hero.atk,
        def: hero.def,
        shield: hero.shield,
        alive: hero.alive,
        cd: hero.cd,
        buffs: hero.buffs.map((b) => ({ ...b })),
        skill: heroDef(hero.archetype).skill,
      })),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private scheduleBot(): void {
    this.botActAt = this.now() + this.timings.botDelayMs;
  }

  private broadcast(events: string[] = [], animation?: TurnAnimation): void {
    for (const player of this.players) {
      if (player.isBot) continue;
      player.send({
        t: 'state',
        view: this.viewFor(player.side),
        events,
        ...(animation ? { animation } : {}),
      });
    }
  }

  private sendError(side: Side, code: ErrorCode, message: string): void {
    const player = this.players.find((p) => p.side === side);
    player?.send({ t: 'error', code, message });
  }
}
