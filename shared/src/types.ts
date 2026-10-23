/** Toàn bộ type dùng chung. Không chứa logic để tránh import vòng. */

// ── Board & gems ───────────────────────────────────────────────────────
export type GemType = 'ATK' | 'HP' | 'MANA' | 'SHIELD';
export type Special = 'BOMB' | 'RAINBOW';
export type Orientation = 'H' | 'V';

export interface Cell {
  type: GemType;
  special: Special | null;
}

/** Bàn cờ phẳng, dài BOARD_SIZE², index = row * SIZE + col. null = ô trống (đang rơi). */
export type Board = (Cell | null)[];
export type Index = number;

export interface Run {
  type: GemType;
  orientation: Orientation;
  cells: Index[];
}

export interface GemCounts {
  ATK: number;
  HP: number;
  MANA: number;
  SHIELD: number;
}

export interface CreatedSpecial {
  index: Index;
  special: Special;
}

/** Một viên ngọc rơi từ ô `from` xuống ô `to` trong wave. */
export interface GemMove {
  from: Index;
  to: Index;
}

/** Ngọc mới sinh ở đầu cột. */
export interface GemSpawn {
  index: Index;
  type: GemType;
}

export interface Wave {
  /** Các run >= 3 tìm thấy ở wave này. */
  runs: Run[];
  /** Ô bị xoá (đã bao gồm nổ lan của bomb/rainbow). */
  cleared: Index[];
  /** Ngọc đặc biệt được tạo ra (ô này KHÔNG bị xoá). */
  created: CreatedSpecial[];
  /** Các viên rơi xuống sau khi xoá. */
  moves: GemMove[];
  /** Ngọc mới sinh ra để lấp cột. */
  spawned: GemSpawn[];
  /** Bàn cờ sau khi wave này resolve xong (đã rơi + refill). */
  board: Board;
  /** Số gem từng loại bị xoá trong wave. */
  counts: GemCounts;
  bombs: number;
  rainbows: number;
}

export type RejectReason = 'NOT_ADJACENT' | 'EMPTY_CELL' | 'NO_MATCH';

export interface TurnResult {
  accepted: boolean;
  reason?: RejectReason;
  board: Board;
  /** Bàn cờ ngay sau khi swap (trước khi nổ) — client dùng làm mốc để vẽ link. */
  swapBoard: Board;
  waves: Wave[];
  counts: GemCounts;
  /** Số gem ⚔️ nổ = số hit thô, CHƯA áp damage cap. */
  hits: number;
  bombs: number;
  rainbows: number;
  cascades: number;
  /** true nếu bàn cờ bị shuffle vì hết nước đi. */
  shuffled: boolean;
}

// ── Heroes ─────────────────────────────────────────────────────────────
export type Archetype =
  | 'Tank'
  | 'Burst'
  | 'Healer'
  | 'Controller'
  | 'Buffer'
  | 'Debuffer'
  | 'Assassin'
  | 'Bruiser';

export type BuffKind = 'ATK_UP' | 'ATK_DOWN' | 'DEF_DOWN' | 'TAUNT';

export interface Buff {
  kind: BuffKind;
  /** 0.5 = 50%, 0.3 = 30%. */
  pct: number;
  /** Số lượt còn hiệu lực (tính theo lượt của đội sở hữu). */
  turns: number;
}

export interface HeroState {
  /** Id instance trong trận, vd "p1:2". */
  uid: string;
  archetype: Archetype;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  shield: number;
  alive: boolean;
  /** Cooldown còn lại của skill. */
  cd: number;
  buffs: Buff[];
}

export interface SkillDef {
  id: string;
  name: string;
  mana: number;
  cd: number;
  desc: string;
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
}

export interface HeroDef {
  archetype: Archetype;
  hp: number;
  atk: number;
  def: number;
  skill: SkillDef;
  passive: PassiveDef;
}

export type Side = 'P1' | 'P2';

export interface SideState {
  side: Side;
  heroes: HeroState[];
  mana: number;
  /** uid tướng địch đang bị target. null = mặc định (Tanker). */
  targetUid: string | null;
  /** Đã dùng skill trong lượt này chưa (tối đa 1). */
  skillUsedThisTurn: boolean;
}
