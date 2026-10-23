/**
 * Bot đối thủ — README mục 5.2.
 * Không cần AI thông minh: 1 mức duy nhất, brute-force swap, ưu tiên Healer.
 */
import type { Board, GemType, Index } from './types.js';
import { cloneBoard, findMoves, findRuns, swapInPlace } from './match3.js';
import { canUseSkill } from './skills.js';
import type { BattleState, TurnAction } from './battle.js';
import { otherSide } from './side.js';
import type { Rng } from './rng.js';

/** Trọng số ưu tiên ngọc khi bot chọn nước đi. */
const WEIGHT: Record<GemType, number> = {
  ATK: 2,
  HP: 0.6,
  MANA: 0.6,
  SHIELD: 0.5,
};

/** Điểm của 1 swap = tổng (trọng số × số gem) của các run liên quan tới 2 ô vừa đổi. */
export function scoreSwap(board: Board, from: Index, to: Index): number {
  const clone = cloneBoard(board);
  swapInPlace(clone, from, to);
  const runs = findRuns(clone).filter((r) => r.cells.includes(from) || r.cells.includes(to));
  let score = 0;
  for (const run of runs) score += WEIGHT[run.type] * run.cells.length;
  return score;
}

export function chooseSwap(board: Board, rng: Rng): [Index, Index] | null {
  const moves = findMoves(board);
  if (moves.length === 0) return null;

  let bestScore = Number.NEGATIVE_INFINITY;
  let best: Array<[Index, Index]> = [];
  for (const move of moves) {
    const score = scoreSwap(board, move[0], move[1]);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[Math.floor(rng() * best.length)] ?? null;
}

export interface BotOptions {
  /** Xác suất dùng skill khi đủ điều kiện (mặc định 0.7). */
  skillChance?: number;
}

export function chooseAction(state: BattleState, rng: Rng, opts: BotOptions = {}): TurnAction | null {
  if (state.winner !== null) return null;

  const side = state.active;
  const active = state.sides[side];
  const enemies = state.sides[otherSide(side)].heroes;

  const swap = chooseSwap(state.board, rng);
  if (!swap) return null;

  const alive = enemies.filter((h) => h.alive);
  const preferred =
    alive.find((h) => h.archetype === 'Healer') ??
    [...alive].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];

  let skill: TurnAction['skill'];
  if (rng() < (opts.skillChance ?? 0.7)) {
    const caster = active.heroes.find((h) => h.alive && canUseSkill(h, active.mana) === null);
    if (caster) skill = { casterUid: caster.uid, targetUid: preferred?.uid ?? null };
  }

  return { swap, targetUid: preferred?.uid ?? null, skill };
}
