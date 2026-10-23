import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import {
  CELLS,
  SIZE,
  cloneBoard,
  createBoard,
  findMoves,
  findRuns,
  gravityAndRefill,
  hasAnyMove,
  hasMatchAt,
  idx,
  isAdjacent,
  makeCell,
  resolveTurn,
  shuffleBoard,
} from '../src/match3.js';
import type { Board, GemType } from '../src/types.js';

const TYPES = CONFIG.GEM_TYPES;

/** Bàn cờ "nền" không có match: type chạy theo chu kỳ 4 nên không bao giờ lặp 3 ô liền. */
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

describe('board creation', () => {
  it('tạo bàn đầy, không có match sẵn, luôn có nước đi', () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      const board = createBoard(mulberry32(seed));
      assert.equal(board.length, CELLS);
      assert.ok(board.every((c) => c !== null), 'board phải đầy');
      assert.equal(findRuns(board).length, 0, 'không được có match sẵn');
      assert.ok(hasAnyMove(board), 'phải có ít nhất 1 nước đi');
    }
  });

  it('tất định theo seed', () => {
    const a = createBoard(mulberry32(7));
    const b = createBoard(mulberry32(7));
    assert.deepEqual(a, b);
  });
});

describe('match detection', () => {
  it('phát hiện run ngang và dọc', () => {
    const board = blankBoard();
    set(board, 4, 2, 'ATK');
    set(board, 4, 3, 'ATK');
    set(board, 4, 4, 'ATK');

    set(board, 6, 6, 'SHIELD');
    set(board, 5, 6, 'SHIELD');
    set(board, 4, 6, 'SHIELD');

    const runs = findRuns(board);
    assert.equal(runs.length, 2);
    assert.ok(runs.some((r) => r.orientation === 'H' && r.type === 'ATK' && r.cells.length === 3));
    assert.ok(runs.some((r) => r.orientation === 'V' && r.type === 'SHIELD' && r.cells.length === 3));
  });

  it('run dài 4 trả về nguyên cụm, không cắt thành 3', () => {
    const board = blankBoard();
    for (const c of [2, 3, 4, 5]) set(board, 2, c, 'MANA');
    const runs = findRuns(board).filter((r) => r.type === 'MANA' && r.orientation === 'H');
    assert.equal(runs.length, 1);
    assert.equal(runs[0]!.cells.length, 4);
  });

  it('hasMatchAt chỉ đúng ô nằm trong match', () => {
    const board = blankBoard();
    set(board, 3, 1, 'ATK');
    set(board, 3, 2, 'ATK');
    set(board, 3, 3, 'ATK');
    assert.ok(hasMatchAt(board, idx(3, 1)));
    assert.ok(hasMatchAt(board, idx(3, 3)));
    assert.equal(hasMatchAt(board, idx(6, 6)), false);
  });
});

describe('swap validation', () => {
  it('từ chối 2 ô không kề nhau', () => {
    const board = blankBoard();
    const res = resolveTurn(board, idx(0, 0), idx(2, 0), mulberry32(1));
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'NOT_ADJACENT');
    assert.deepEqual(res.board, board, 'bàn cờ phải nguyên vẹn');
  });

  it('từ chối swap không tạo match và trả bàn cờ y nguyên', () => {
    const board = blankBoard();
    const from = idx(0, 0);
    const to = idx(0, 1);
    assert.equal(isAdjacent(from, to), true);
    const res = resolveTurn(board, from, to, mulberry32(1));
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'NO_MATCH');
    assert.deepEqual(res.board, board);
  });

  it('không mutate bàn cờ đầu vào', () => {
    const board = blankBoard();
    set(board, 0, 1, 'ATK');
    set(board, 0, 2, 'HP');
    set(board, 0, 3, 'ATK');
    set(board, 0, 4, 'HP');
    const snapshot = cloneBoard(board);
    resolveTurn(board, idx(0, 2), idx(0, 3), mulberry32(3));
    assert.deepEqual(board, snapshot);
  });
});

describe('resolve turn', () => {
  it('match 3 gem ATK → 3 hit, bàn cờ vẫn hợp lệ', () => {
    const board = blankBoard();
    set(board, 0, 1, 'ATK');
    set(board, 0, 2, 'HP');
    set(board, 0, 3, 'ATK');
    set(board, 0, 4, 'HP');

    const res = resolveTurn(board, idx(0, 2), idx(0, 3), mulberry32(11));

    assert.equal(res.accepted, true);
    assert.equal(res.waves[0]!.counts.ATK >= 3, true);
    assert.equal(res.hits, res.counts.ATK);
    assert.equal(res.board.length, CELLS);
    assert.ok(res.board.every((c) => c !== null));
    assert.equal(findRuns(res.board).length, 0);
    assert.ok(hasAnyMove(res.board));

    // Dữ liệu cho animation: wave có board đầy đủ + danh sách rơi
    const wave = res.waves[0]!;
    assert.equal(wave.board.length, CELLS);
    assert.ok(wave.board.every((c) => c !== null));
    assert.ok(wave.moves.length + wave.spawned.length > 0, 'wave phải có ngọc rơi/spawn');
    for (const created of wave.created) {
      assert.equal(wave.cleared.includes(created.index), false, 'ô tạo special không bị xoá');
    }
  });

  it('match 4 → tạo Bomb tại ô đích', () => {
    const board = blankBoard();
    set(board, 0, 0, 'ATK');
    set(board, 0, 1, 'ATK');
    set(board, 0, 2, 'HP');
    set(board, 0, 3, 'ATK');
    set(board, 0, 4, 'HP');
    set(board, 1, 2, 'ATK');

    const res = resolveTurn(board, idx(1, 2), idx(0, 2), mulberry32(5));

    assert.equal(res.accepted, true);
    const created = res.waves[0]!.created;
    assert.equal(created.length, 1);
    assert.equal(created[0]!.index, idx(0, 2));
    assert.equal(created[0]!.special, 'BOMB');
    // Ô sinh bomb không bị xoá → chỉ 3 gem ATK được tính trong wave đầu.
    assert.equal(res.waves[0]!.counts.ATK, 3);
  });

  it('Bomb nổ lan 3x3 khi bị match', () => {
    const board = blankBoard();
    set(board, 0, 3, 'ATK');
    board[idx(1, 3)] = makeCell('ATK', 'BOMB');
    set(board, 2, 3, 'HP');
    set(board, 3, 3, 'ATK');

    const res = resolveTurn(board, idx(3, 3), idx(2, 3), mulberry32(9));

    assert.equal(res.accepted, true);
    assert.equal(res.waves[0]!.bombs, 1);
    assert.ok(res.waves[0]!.cleared.length >= 9, `cleared=${res.waves[0]!.cleared.length}`);
  });

  it('một wave ăn nhiều loại ngọc cùng lúc (2 run khác màu)', () => {
    const board = blankBoard();
    // Run ATK sẵn ở hàng 0
    set(board, 0, 0, 'ATK');
    set(board, 0, 1, 'ATK');
    set(board, 0, 2, 'ATK');
    // Run HP sẵn ở hàng 7
    set(board, 7, 5, 'HP');
    set(board, 7, 6, 'HP');
    set(board, 7, 7, 'HP');
    // Nước swap tạo thêm run MANA
    set(board, 2, 1, 'MANA');
    set(board, 2, 2, 'HP');
    set(board, 2, 3, 'MANA');
    set(board, 2, 4, 'HP');

    const res = resolveTurn(board, idx(2, 2), idx(2, 3), mulberry32(31));
    assert.equal(res.accepted, true);

    const wave = res.waves[0]!;
    const types = new Set(wave.runs.map((run) => run.type));
    assert.ok(types.size >= 2, `wave phải gom nhiều loại, nhận: ${[...types].join(',')}`);
    assert.ok(wave.counts.ATK >= 3);
    assert.ok(wave.counts.HP >= 3);
  });

  it('tất định: cùng seed → cùng kết quả', () => {
    const build = (): Board => {
      const b = blankBoard();
      set(b, 2, 1, 'ATK');
      set(b, 2, 2, 'HP');
      set(b, 2, 3, 'ATK');
      set(b, 2, 4, 'HP');
      return b;
    };
    const a = resolveTurn(build(), idx(2, 2), idx(2, 3), mulberry32(123));
    const b = resolveTurn(build(), idx(2, 2), idx(2, 3), mulberry32(123));
    assert.deepEqual(a, b);
  });
});

describe('invariants sau nhiều lượt', () => {
  it('40 lượt liên tiếp luôn giữ: đầy, không match, còn nước đi', () => {
    const rng = mulberry32(2026);
    let board = createBoard(rng);

    for (let turn = 0; turn < 40; turn++) {
      const moves = findMoves(board);
      assert.ok(moves.length > 0);
      const [from, to] = moves[Math.floor(rng() * moves.length)]!;
      const res = resolveTurn(board, from, to, rng);
      assert.equal(res.accepted, true);
      board = res.board;

      assert.equal(board.length, CELLS);
      assert.ok(board.every((c) => c !== null), `turn ${turn}: bàn cờ bị khuyết`);
      assert.equal(findRuns(board).length, 0, `turn ${turn}: còn match sau resolve`);
      assert.ok(hasAnyMove(board), `turn ${turn}: hết nước đi`);
    }
  });
});

describe('shuffle & gravity', () => {
  it('shuffle xoá hết match và giữ nguyên số gem từng loại', () => {
    const board = blankBoard();
    for (const c of [0, 1, 2]) set(board, 0, c, 'ATK');

    const count = (b: Board, t: GemType) => b.filter((x) => x?.type === t).length;
    const before = { ATK: count(board, 'ATK'), HP: count(board, 'HP'), MANA: count(board, 'MANA'), SHIELD: count(board, 'SHIELD') };

    shuffleBoard(board, mulberry32(77));

    assert.equal(findRuns(board).length, 0);
    assert.ok(hasAnyMove(board));
    assert.deepEqual(
      { ATK: count(board, 'ATK'), HP: count(board, 'HP'), MANA: count(board, 'MANA'), SHIELD: count(board, 'SHIELD') },
      before,
    );
  });

  it('gravity dồn gem xuống đáy và lấp đầy cột', () => {
    const board = blankBoard();
    board[idx(7, 0)] = null;
    board[idx(6, 0)] = null;
    gravityAndRefill(board, mulberry32(1));
    assert.ok(board.every((c) => c !== null));
  });
});
