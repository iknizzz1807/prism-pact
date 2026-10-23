/**
 * Draft (ban/pick) state machine — README mục 4.2.
 * Pure logic, không biết gì về mạng hay timer → server và test dùng chung.
 *
 * Thứ tự: P1 pick 2 → P2 pick 2 → P1 pick 2 → P2 pick 2 → mỗi bên ban 1 (ẩn) → done.
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
}

export function createDraft(firstPick: Side = 'P1'): DraftState {
  return {
    pool: [...ROSTER.map((h) => h.archetype)],
    picks: { P1: [], P2: [] },
    bans: { P1: [], P2: [] },
    pendingBan: { P1: null, P2: null },
    round: 1,
    picksLeftThisTurn: CONFIG.PICKS_PER_ROUND,
    turn: firstPick,
    phase: 'pick',
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

  state.picksLeftThisTurn -= 1;
  if (state.picksLeftThisTurn === 0) {
    state.turn = otherSide(side);
    state.picksLeftThisTurn = CONFIG.PICKS_PER_ROUND;
  }

  state.round = Math.min(
    CONFIG.DRAFT_ROUNDS,
    Math.floor(totalPicks(state) / (CONFIG.PICKS_PER_ROUND * 2)) + 1,
  );

  if (totalPicks(state) >= CONFIG.ROSTER_SIZE) {
    state.phase = 'ban';
    state.pendingBan = { P1: null, P2: null };
  }

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
