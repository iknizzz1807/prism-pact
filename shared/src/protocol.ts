/** Wire protocol giữa client và server — dùng chung 2 phía. Chỉ type, không logic. */
import type { Archetype, Buff, GemType, Side, SkillDef, Special } from './types.js';

export interface GemView {
  type: 'ATK' | 'HP' | 'MANA' | 'SHIELD';
  special: Special | null;
}

export interface HeroView {
  uid: string;
  archetype: Archetype;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  shield: number;
  alive: boolean;
  cd: number;
  skill: SkillDef;
  buffs: Buff[];
  /** Skill id đã dùng 1 lần/trận (vd Divine Aegis). */
  onceUsed: string[];
  /** Đã dùng skill đầu tiên — cho passive Chronarch. */
  firstSkillUsed: boolean;
}

export interface ThrallView {
  hp: number;
  maxHp: number;
  atk: number;
  ownerUid: string;
  alive: boolean;
}

export interface SideView {
  side: Side;
  mana: number;
  heroes: HeroView[];
  targetUid: string | null;
  thrall: ThrallView | null;
  /** +5 mana cost nếu địch có Spellbreaker sống. */
  skillTax: number;
}

export interface DraftView {
  phase: 'pick' | 'ban' | 'done';
  round: number;
  /** Tướng còn trong pool. */
  pool: Archetype[];
  /** Pick của cả 2 bên — live/công khai. */
  picks: Record<Side, Archetype[]>;
  /** Chỉ có dữ liệu khi cả 2 đã ban xong. */
  bans: Record<Side, Archetype[]>;
  turn: Side;
  picksLeftThisTurn: number;
  /** Ban của CHÍNH người xem (ẩn với đối thủ). */
  yourBan: Archetype | null;
}

export interface BattleView {
  board: (GemView | null)[];
  sides: Record<Side, SideView>;
  active: Side;
  turn: number;
  suddenDeath: boolean;
}

/** Từng bước resolve của một lượt — để client phát lại animation. */
export interface WaveView {
  runs: Array<{ cells: number[]; type: GemType }>;
  cleared: number[];
  created: Array<{ index: number; special: Special }>;
  moves: Array<{ from: number; to: number }>;
  spawned: Array<{ index: number; type: GemType }>;
  board: (GemView | null)[];
  counts: Record<GemType, number>;
  bombs: number;
  rainbows: number;
}

export interface TurnAnimation {
  side: Side;
  from: number;
  to: number;
  /** Bàn cờ ngay sau swap — client vẽ theo đúng mốc này trước khi nổ. */
  swapBoard: (GemView | null)[];
  waves: WaveView[];
  skillCasterUid?: string;
  /** Tướng bị đánh trong lượt (để hiệu ứng ngọc bay tới đúng người). */
  targetUid: string | null;
}

export interface RankView {
  points: number;
  delta: number;
}

export interface MatchView {
  matchId: string;
  mode: 'pvp' | 'bot';
  /** Người xem là side nào. */
  you: Side;
  phase: 'draft' | 'ban' | 'battle' | 'result';
  /** epoch ms; null khi đã kết thúc. */
  deadline: number | null;
  draft: DraftView | null;
  battle: BattleView | null;
  winner: Side | 'draw' | null;
  rank?: RankView;
}

// ── Client → Server ─────────────────────────────────────────────────────

export type ClientMessage =
  | { t: 'queue'; name: string }
  | { t: 'playBot'; name: string }
  | { t: 'cancelQueue' }
  | { t: 'pick'; hero: Archetype }
  | { t: 'ban'; hero: Archetype }
  | { t: 'skill'; casterUid: string; targetUid?: string }
  | { t: 'target'; targetUid: string }
  | { t: 'swap'; from: number; to: number }
  | { t: 'ping' };

// ── Server → Client ─────────────────────────────────────────────────────

export type ErrorCode =
  | 'BAD_MESSAGE'
  | 'BAD_PHASE'
  | 'NOT_YOUR_TURN'
  | 'ILLEGAL_MOVE'
  | 'NOT_IN_MATCH'
  | 'ALREADY_QUEUED';

export type ServerMessage =
  | { t: 'hello'; playerId: string }
  | { t: 'queued'; position: number }
  | { t: 'match'; view: MatchView; events: string[] }
  | { t: 'state'; view: MatchView; events: string[]; animation?: TurnAnimation }
  | { t: 'error'; code: ErrorCode; message: string }
  | { t: 'end'; winner: Side | 'draw'; rank: RankView }
  | { t: 'pong' };

export type Timings = {
  pickMs: number;
  banMs: number;
  turnMs: number;
  botDelayMs: number;
  disconnectGraceMs: number;
};
