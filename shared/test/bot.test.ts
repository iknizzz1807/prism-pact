import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import {
  DEFAULT_GEM_WEIGHTS,
  chooseSwap,
  chooseSwapWithWeights,
  scoreSwapWithWeights,
} from '../src/bot.js';
import {
  SIZE,
  findMoves,
  findRuns,
  idx,
  makeCell,
} from '../src/match3.js';
import type { Board, GemType } from '../src/types.js';

const TYPES = CONFIG.GEM_TYPES;

/** Bàn cờ nền không có match: type chạy theo chu kỳ 4. */
function blankBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      board.push(makeCell(TYPES[(r + c) % TYPES.length]!));
    }
  }
  return board;
}

function set(board: Board, r: number, c: number, type: GemType): void {
  board[idx(r, c)] = makeCell(type);
}

/** Swap (4,4) ↔ (5,4) tạo run HP ngang 4 ô ở hàng 4. */
function hpRunBoard(): Board {
  const board = blankBoard();
  set(board, 4, 1, 'MANA');
  set(board, 4, 2, 'HP');
  set(board, 4, 3, 'HP');
  // (4,4) là ATK, (5,4) là HP theo chu kỳ nền.
  return board;
}

describe('weighted swap search', () => {
  it('trọng số HP làm swap tạo run HP có điểm cao hơn mặc định', () => {
    const board = hpRunBoard();
    assert.equal(findRuns(board).length, 0, 'bàn nền không được có match sẵn');

    const from = idx(4, 4);
    const to = idx(5, 4);
    assert.ok(
      findMoves(board).some(
        ([a, b]) => (a === from && b === to) || (a === to && b === from),
      ),
      'swap mục tiêu phải là nước đi hợp lệ',
    );

    const hpWeights = { ATK: 0.1, HP: 3, MANA: 0.1, SHIELD: 0.1 };
    const defaultScore = scoreSwapWithWeights(board, from, to, DEFAULT_GEM_WEIGHTS);
    const hpScore = scoreSwapWithWeights(board, from, to, hpWeights);

    assert.ok(hpScore > defaultScore, `HP score ${hpScore} phải > default ${defaultScore}`);
  });

  it('chooseSwapWithWeights chọn đúng swap có điểm cao nhất theo trọng số', () => {
    const board = hpRunBoard();
    const hpWeights = { ATK: 0.1, HP: 3, MANA: 0.1, SHIELD: 0.1 };
    const moves = findMoves(board);
    const best = Math.max(
      ...moves.map(([from, to]) => scoreSwapWithWeights(board, from, to, hpWeights)),
    );

    const chosen = chooseSwapWithWeights(board, mulberry32(1), hpWeights);
    assert.ok(chosen);
    assert.equal(
      scoreSwapWithWeights(board, chosen[0], chosen[1], hpWeights),
      best,
    );
  });

  it('chooseSwap mặc định vẫn tương thích chooseSwapWithWeights(DEFAULT)', () => {
    const board = hpRunBoard();
    const moves = findMoves(board);
    const best = Math.max(
      ...moves.map(([from, to]) => scoreSwapWithWeights(board, from, to, DEFAULT_GEM_WEIGHTS)),
    );

    const chosen = chooseSwap(board, mulberry32(2));
    assert.ok(chosen);
    assert.equal(
      scoreSwapWithWeights(board, chosen[0], chosen[1], DEFAULT_GEM_WEIGHTS),
      best,
    );
  });
});
