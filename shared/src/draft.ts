/**
 * Draft (ban/pick) state machine — README mục 4.2 + D-23.
 * Pure logic, không biết gì về mạng hay timer → server và test dùng chung.
 *
 * P1: snake-8 (4 pick/bên) → ban ẩn 1/bên:
 *   P1 → P2 → P2 → P1 → P1 → P2 → P2 → P1
 * Nếu firstPick = P2 thì đảo side.
 */
import { CONFIG } from './config.js';
import { ROSTER } from './heroes.js';
import { otherSide } from './side.js';
import type { Archetype, Side } from './types.js';

export type DraftPhase = 'pick' | 'ban' | 'done';

export interface DraftState {
  /** Tướng còn trong pool (chưa ai pick). */
  pool: Archetype[];
  picks: Record<Side, Archetype[]>;
  /** `bans[side]` = tướng mà `side` đã cấm (lấy từ đội đối thủ). */
  bans: Record<Side, Archetype[]>;
  /** Ban tạm, ẩn với đối thủ cho tới khi cả 2 xong. */
  pendingBan: Record<Side, Archetype | null>;
  /** 1 hoặc 2 (2 vòng × 2 pick mỗi bên). */
  round: number;
  /** Số pick còn lại của bên đang có lượt (1 hoặc 2). */
  picksLeftThisTurn: number;
  turn: Side;
  phase: DraftPhase;
  /** Vị trí hiện tại trong pickOrder (0..7). */
  pickIndex: number;
  /** Toàn bộ thứ tự pick của trận — snake-8. */
  pickOrder: Side[];
}

const SNAKE_8: readonly Side[] = ['P1', 'P2', 'P2', 'P1', 'P1', 'P2', 'P2', 'P1'];

function pickOrderFor(firstPick: Side): Side[] {
  return (firstPick === 'P1' ? [...SNAKE_8] : SNAKE_8.map(otherSide)) as Side[];
}

function consecutiveCount(order: readonly Side[], index: number): number {
  const side = order[index];
  if (!side) return 0;
  let count = 0;
  for (let i = index; i < order.length && order[i] === side; i += 1) count += 1;
  return count;
}

export function createDraft(firstPick: Side = 'P1'): DraftState {
  const pickOrder = pickOrderFor(firstPick);
  return {
    pool: [...ROSTER.map((h) => h.archetype)],
    picks: { P1: [], P2: [] },
    bans: { P1: [], P2: [] },
    pendingBan: { P1: null, P2: null },
    round: 1,
    picksLeftThisTurn: consecutiveCount(pickOrder, 0),
    turn: pickOrder[0]!,
    phase: 'pick',
    pickIndex: 0,
    pickOrder,
  };
}

export const totalPicks = (state: DraftState): number =>
  state.picks.P1.length + state.picks.P2.length;

export function legalPick(state: DraftState, side: Side, hero: Archetype): boolean {
  return (
    state.phase === 'pick' &&
    state.turn === side &&
    state.pool.includes(hero) &&
    state.picks[side].length < CONFIG.PICKS_PER_SIDE
  );
}

/** @returns false nếu nước đi không hợp lệ (state giữ nguyên). */
export function applyPick(state: DraftState, side: Side, hero: Archetype): boolean {
  if (!legalPick(state, side, hero)) return false;

  state.pool = state.pool.filter((h) => h !== hero);
  state.picks[side].push(hero);

  state.pickIndex += 1;

  // Đủ 8 pick (4/bên) → chuyển sang ban ẩn.
  if (state.pickIndex >= CONFIG.PICKS_PER_SIDE * 2) {
    state.phase = 'ban';
    state.picksLeftThisTurn = 0;
    state.pendingBan = { P1: null, P2: null };
    return true;
  }

  state.turn = state.pickOrder[state.pickIndex]!;
  state.picksLeftThisTurn = consecutiveCount(state.pickOrder, state.pickIndex);
  state.round = Math.min(2, Math.floor(state.pickIndex / 4) + 1);

  return true;
}

export function legalBan(state: DraftState, side: Side, hero: Archetype): boolean {
  if (state.phase !== 'ban') return false;
  if (state.pendingBan[side] !== null) return false;
  const target = state.picks[otherSide(side)];
  return target.includes(hero) && !state.bans[side].includes(hero);
}

/** Ban của mỗi bên nhắm vào 1 trong 4 tướng của đối thủ. */
export function applyBan(state: DraftState, side: Side, hero: Archetype): boolean {
  if (!legalBan(state, side, hero)) return false;

  state.pendingBan[side] = hero;

  if (state.pendingBan.P1 !== null && state.pendingBan.P2 !== null) {
    state.bans.P1 = [state.pendingBan.P1];
    state.bans.P2 = [state.pendingBan.P2];
    state.phase = 'done';
  }
  return true;
}

/** Đội hình cuối: picks của mình trừ tướng bị đối thủ ban. */
export function finalTeams(state: DraftState): Record<Side, Archetype[]> {
  const bannedAgainstP1 = state.bans.P2;
  const bannedAgainstP2 = state.bans.P1;
  return {
    P1: state.picks.P1.filter((h) => !bannedAgainstP1.includes(h)),
    P2: state.picks.P2.filter((h) => !bannedAgainstP2.includes(h)),
  };
}

// ── Auto action khi hết giờ / cho bot ──────────────────────────────────

export function autoPick(state: DraftState, rng: () => number): Archetype | null {
  if (state.phase !== 'pick' || state.pool.length === 0) return null;
  const hero = state.pool[Math.floor(rng() * state.pool.length)] ?? null;
  if (hero) applyPick(state, state.turn, hero);
  return hero;
}

export function autoBan(state: DraftState, side: Side, rng: () => number): Archetype | null {
  if (state.phase !== 'ban' || state.pendingBan[side] !== null) return null;
  const candidates = state.picks[otherSide(side)].filter((h) => !state.bans[side].includes(h));
  if (candidates.length === 0) return null;
  const hero = candidates[Math.floor(rng() * candidates.length)] ?? null;
  if (hero) applyBan(state, side, hero);
  return hero;
}
