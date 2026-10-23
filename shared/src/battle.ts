/**
 * Battle loop — ghép match-3 + combat + skill thành một lượt hoàn chỉnh.
 * README mục 4.4. Server sẽ dùng đúng hàm này; client không được tự tính.
 */
import { CONFIG } from './config.js';
import type { Archetype, Board, Index, Side, SideState } from './types.js';
import type { TurnAnimation, WaveView } from './protocol.js';
import { createBoard, createsMatch, resolveTurn } from './match3.js';
import {
  applyGemEconomy,
  applySuddenDeath,
  endTurn,
  expireTaunts,
  performBasicAttacks,
  resolveAttackTarget,
  startTurn,
} from './combat.js';
import { createTeam, isTeamWiped } from './heroes.js';
import { useSkill } from './skills.js';
import { mulberry32, type Rng } from './rng.js';
import { otherSide } from './side.js';

export interface BattleState {
  board: Board;
  sides: Record<Side, SideState>;
  active: Side;
  turn: number;
  suddenDeath: boolean;
  winner: Side | 'draw' | null;
  logs: string[];
}

export interface TurnAction {
  swap: [Index, Index];
  targetUid?: string | null;
  skill?: { casterUid: string; targetUid?: string | null };
}

export type TurnReject = 'GAME_OVER' | 'NOT_ADJACENT' | 'EMPTY_CELL' | 'NO_MATCH';

export interface TurnReport {
  accepted: boolean;
  reason?: TurnReject;
  turn: number;
  side: Side;
  /** Số gem ⚔️ nổ trong lượt. */
  hits: number;
  /** Damage thực tế lên đội địch (basic + skill). */
  damage: number;
  healed: number;
  mana: number;
  board: Board;
  winner: Side | 'draw' | null;
  logs: string[];
  /** Dữ liệu để client phát lại từng bước (null nếu lượt không có swap). */
  animation: TurnAnimation | null;
}

function makeSide(side: Side, archetypes: [Archetype, Archetype, Archetype]): SideState {
  return {
    side,
    heroes: createTeam(archetypes, side),
    mana: 0,
    targetUid: null,
    skillUsedThisTurn: false,
  };
}

export function createBattle(
  p1: [Archetype, Archetype, Archetype],
  p2: [Archetype, Archetype, Archetype],
  rng: Rng = mulberry32(Date.now()),
  board: Board = createBoard(rng),
): BattleState {
  return {
    board,
    sides: { P1: makeSide('P1', p1), P2: makeSide('P2', p2) },
    active: 'P1',
    turn: 0,
    suddenDeath: false,
    winner: null,
    logs: [],
  };
}

/** Chấp nhận swap mà không thay đổi state — server dùng để validate trước khi trừ lượt. */
export function isLegalSwap(board: Board, swap: [Index, Index]): TurnReject | null {
  const [from, to] = swap;
  const adjacent =
    from >= 0 &&
    to >= 0 &&
    from < board.length &&
    to < board.length &&
    Math.abs(Math.floor(from / CONFIG.BOARD_SIZE) - Math.floor(to / CONFIG.BOARD_SIZE)) +
      Math.abs((from % CONFIG.BOARD_SIZE) - (to % CONFIG.BOARD_SIZE)) ===
      1;

  if (!adjacent) return 'NOT_ADJACENT';
  if (!board[from] || !board[to]) return 'EMPTY_CELL';
  if (!createsMatch(board, from, to)) return 'NO_MATCH';
  return null;
}

export function playTurn(state: BattleState, action: TurnAction, rng: Rng): TurnReport {
  const side = state.active;
  const active = state.sides[side];
  const inactive = state.sides[otherSide(side)];
  const logs: string[] = [];

  const base: TurnReport = {
    accepted: false,
    turn: state.turn,
    side,
    hits: 0,
    damage: 0,
    healed: 0,
    mana: active.mana,
    board: state.board,
    winner: state.winner,
    logs,
    animation: null,
  };

  if (state.winner !== null) return { ...base, reason: 'GAME_OVER' };

  // ── Sudden Death: đầu mỗi lượt sau MAX_TURNS, cả 2 bên mất % maxHP ──
  if (state.turn >= CONFIG.MAX_TURNS) {
    state.suddenDeath = true;
    const a = applySuddenDeath(active.heroes);
    const b = applySuddenDeath(inactive.heroes);
    logs.push(`SUDDEN DEATH: P1 -${a} HP, P2 -${b} HP`);
    resolveWinner(state);
    if (state.winner !== null) {
      // Lượt này vẫn được tính (sudden death đã resolve), chỉ không có swap.
      return { ...base, accepted: true, winner: state.winner, logs };
    }
  }

  // ── Passive đầu lượt ────────────────────────────────────────────────
  logs.push(...startTurn(active.heroes));

  // ── Validate swap TRƯỚC khi tiêu mana / cooldown ────────────────────
  const illegal = isLegalSwap(state.board, action.swap);
  if (illegal) return { ...base, reason: illegal };

  // ── 1. Skill (tối đa 1/lượt) ────────────────────────────────────────
  let skillDamage = 0;
  if (action.skill) {
    const caster = active.heroes.find((h) => h.uid === action.skill!.casterUid);
    if (caster) {
      const outcome = useSkill({
        caster,
        allies: active.heroes,
        enemies: inactive.heroes,
        mana: active.mana,
        targetUid: action.skill.targetUid ?? action.targetUid ?? null,
        alreadyUsedThisTurn: active.skillUsedThisTurn,
      });
      active.mana = outcome.mana;
      if (outcome.ok) {
        active.skillUsedThisTurn = true;
        skillDamage = outcome.damage;
        logs.push(...outcome.logs);
      } else {
        logs.push(`Skill bị từ chối: ${outcome.reason}`);
      }

      // Skill có thể kết thúc trận ngay (Execute lên tướng cuối).
      resolveWinner(state);
      if (state.winner !== null) {
        endTurn(active.heroes);
        active.skillUsedThisTurn = false;
        state.turn += 1;
        state.logs.push(...logs);
        return { ...base, accepted: true, damage: skillDamage, mana: active.mana, winner: state.winner, logs };
      }
    }
  }

  // ── 2. Resolve match-3 ──────────────────────────────────────────────
  const resolved = resolveTurn(state.board, action.swap[0], action.swap[1], rng);
  if (!resolved.accepted) {
    // Không thể xảy ra sau isLegalSwap (đã có kèm kiểm tra match), nhưng vẫn bảo vệ.
    return { ...base, reason: (resolved.reason ?? 'NO_MATCH') as TurnReject, mana: active.mana, logs };
  }
  state.board = resolved.board;

  // ── 3. 🩸 💧 🛡️ ─────────────────────────────────────────────────────
  const economy = applyGemEconomy(active.heroes, resolved.counts, active.mana);
  active.mana = economy.mana;
  logs.push(
    `Match ${resolved.cascades} wave — ⚔️${resolved.counts.ATK} 🩸${resolved.counts.HP} 💧${resolved.counts.MANA} 🛡️${resolved.counts.SHIELD}` +
      (resolved.bombs > 0 ? ` · 💣${resolved.bombs}` : ''),
  );

  // ── 4. ⚔️ damage ────────────────────────────────────────────────────
  const target = resolveAttackTarget(inactive.heroes, action.targetUid ?? null);
  const attack = target
    ? performBasicAttacks({
        attackers: active.heroes,
        allies: active.heroes,
        target,
        enemies: inactive.heroes,
        hits: resolved.hits,
      })
    : { scoredHits: 0, overflowMana: resolved.hits, totalDealt: 0, absorbedTotal: 0, healed: 0, hits: [] };

  active.mana = Math.min(CONFIG.MANA_MAX, active.mana + attack.overflowMana);

  if (target && attack.hits.length > 0) {
    const parts = [`${attack.scoredHits} hit → ${target.uid}: -${attack.totalDealt} HP`];
    if (attack.absorbedTotal > 0) parts.push(`giáp chặn ${attack.absorbedTotal}`);
    if (attack.overflowMana > 0) parts.push(`+${attack.overflowMana} mana (vượt cap)`);
    if (!target.alive) parts.push('☠');
    logs.push(parts.join(' · '));
  } else if (resolved.hits > 0) {
    logs.push(`Không còn mục tiêu — ${resolved.hits} hit chuyển thành mana`);
  }

  // ── 5. Kết thúc lượt ────────────────────────────────────────────────
  endTurn(active.heroes);
  expireTaunts(inactive.heroes);
  active.skillUsedThisTurn = false;

  resolveWinner(state);
  state.turn += 1;

  if (state.winner === null) {
    state.active = otherSide(side);
  }

  state.logs.push(...logs);

  const animation: TurnAnimation = {
    side,
    from: action.swap[0],
    to: action.swap[1],
    ...(action.skill ? { skillCasterUid: action.skill.casterUid } : {}),
    targetUid: target?.uid ?? null,
    swapBoard: resolved.swapBoard.map((cell) => (cell ? { type: cell.type, special: cell.special } : null)),
    waves: resolved.waves.map(
      (wave): WaveView => ({
        runs: wave.runs.map((run) => ({ cells: [...run.cells], type: run.type })),
        cleared: [...wave.cleared],
        created: wave.created.map((item) => ({ ...item })),
        moves: wave.moves.map((move) => ({ ...move })),
        spawned: wave.spawned.map((spawn) => ({ ...spawn })),
        board: wave.board.map((cell) => (cell ? { type: cell.type, special: cell.special } : null)),
        counts: { ...wave.counts },
        bombs: wave.bombs,
        rainbows: wave.rainbows,
      }),
    ),
  };

  return {
    accepted: true,
    turn: base.turn,
    side,
    hits: resolved.hits,
    damage: attack.totalDealt + skillDamage,
    healed: economy.healed + attack.healed,
    mana: active.mana,
    board: state.board,
    winner: state.winner,
    logs,
    animation,
  };
}

function resolveWinner(state: BattleState): void {
  const p1Dead = isTeamWiped(state.sides.P1.heroes);
  const p2Dead = isTeamWiped(state.sides.P2.heroes);
  if (p1Dead && p2Dead) state.winner = 'draw';
  else if (p2Dead) state.winner = 'P1';
  else if (p1Dead) state.winner = 'P2';
}
