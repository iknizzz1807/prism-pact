/**
 * Match-3 core — pure, deterministic, không phụ thuộc engine.
 * Spec: README mục 4.3, 4.4, 4.6, 4.11.
 *
 * Quy ước index: i = row * SIZE + col.
 */
import { CONFIG } from './config.js';
import type {
  Board,
  Cell,
  GemCounts,
  GemMove,
  GemSpawn,
  GemType,
  Index,
  RejectReason,
  Run,
  Special,
  TurnResult,
  Wave,
} from './types.js';
import { pickWeighted, randInt, type Rng } from './rng.js';

export const SIZE = CONFIG.BOARD_SIZE;
export const CELLS = SIZE * SIZE;

export const idx = (row: number, col: number): Index => row * SIZE + col;
export const rowOf = (i: Index): number => Math.floor(i / SIZE);
export const colOf = (i: Index): number => i % SIZE;

export const emptyCounts = (): GemCounts => ({ ATK: 0, HP: 0, MANA: 0, SHIELD: 0 });

export function makeCell(type: GemType, special: Special | null = null): Cell {
  return { type, special };
}

export function cloneBoard(board: Board): Board {
  return board.map((c) => (c ? { type: c.type, special: c.special } : null));
}

export const isAdjacent = (a: Index, b: Index): boolean => {
  if (a === b || a < 0 || b < 0 || a >= CELLS || b >= CELLS) return false;
  return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1;
};

export function swapInPlace(board: Board, a: Index, b: Index): void {
  const tmp = board[a] ?? null;
  board[a] = board[b] ?? null;
  board[b] = tmp;
}

// ── Sinh bàn cờ ────────────────────────────────────────────────────────

function pickWeightedType(rng: Rng): GemType {
  const types = CONFIG.GEM_TYPES;
  const weights = types.map((t) => CONFIG.GEM_SPAWN_WEIGHT[t]);
  return pickWeighted(types, weights, rng) ?? 'ATK';
}

/** Tạo bàn cờ đầy, không có match sẵn, và chắc chắn có ít nhất 1 nước đi. */
export function createBoard(rng: Rng): Board {
  for (let attempt = 0; attempt < 100; attempt++) {
    const board: Board = new Array<Cell | null>(CELLS).fill(null);
    for (let i = 0; i < CELLS; i++) {
      board[i] = makeCell(pickTypeAvoidingRuns(board, i, rng));
    }
    if (hasAnyMove(board)) return board;
  }
  // Không tưởng tượng nổi trường hợp này, nhưng vẫn phải trả về bàn hợp lệ.
  return shuffleFresh(rng);
}

function pickTypeAvoidingRuns(board: Board, i: Index, rng: Rng): GemType {
  const r = rowOf(i);
  const c = colOf(i);
  const banned = new Set<GemType>();

  if (c >= 2) {
    const a = board[idx(r, c - 1)];
    const b = board[idx(r, c - 2)];
    if (a && b && a.type === b.type) banned.add(a.type);
  }
  if (r >= 2) {
    const a = board[idx(r - 1, c)];
    const b = board[idx(r - 2, c)];
    if (a && b && a.type === b.type) banned.add(a.type);
  }

  const pool = CONFIG.GEM_TYPES.filter((t) => !banned.has(t));
  return pool[randInt(rng, pool.length)] ?? 'ATK';
}

// ── Dò match ───────────────────────────────────────────────────────────

/** Tất cả run >= 3 theo hàng và cột. Run dài 4/5 trả về nguyên cụm, không cắt thành 3. */
export function findRuns(board: Board): Run[] {
  const runs: Run[] = [];

  for (let r = 0; r < SIZE; r++) {
    let start = 0;
    for (let c = 1; c <= SIZE; c++) {
      const prev = board[idx(r, start)];
      const cur = c < SIZE ? board[idx(r, c)] : null;
      const same = !!prev && !!cur && prev.type === cur.type;
      if (!same) {
        if (prev && c - start >= 3) {
          const cells: Index[] = [];
          for (let k = start; k < c; k++) cells.push(idx(r, k));
          runs.push({ type: prev.type, orientation: 'H', cells });
        }
        start = c;
      }
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let start = 0;
    for (let r = 1; r <= SIZE; r++) {
      const prev = board[idx(start, c)];
      const cur = r < SIZE ? board[idx(r, c)] : null;
      const same = !!prev && !!cur && prev.type === cur.type;
      if (!same) {
        if (prev && r - start >= 3) {
          const cells: Index[] = [];
          for (let k = start; k < r; k++) cells.push(idx(k, c));
          runs.push({ type: prev.type, orientation: 'V', cells });
        }
        start = r;
      }
    }
  }

  return runs;
}

/** Ô i có nằm trong một match >= 3 không (dùng để validate swap). */
export function hasMatchAt(board: Board, i: Index): boolean {
  const self = board[i];
  if (!self) return false;
  const r = rowOf(i);
  const c = colOf(i);

  let n = 1;
  for (let k = c - 1; k >= 0 && board[idx(r, k)]?.type === self.type; k--) n++;
  for (let k = c + 1; k < SIZE && board[idx(r, k)]?.type === self.type; k++) n++;
  if (n >= 3) return true;

  n = 1;
  for (let k = r - 1; k >= 0 && board[idx(k, c)]?.type === self.type; k--) n++;
  for (let k = r + 1; k < SIZE && board[idx(k, c)]?.type === self.type; k++) n++;
  return n >= 3;
}

/** Swap from→to có tạo ra match không. Trả board về nguyên trạng. */
export function createsMatch(board: Board, from: Index, to: Index): boolean {
  swapInPlace(board, from, to);
  const ok = hasMatchAt(board, from) || hasMatchAt(board, to);
  swapInPlace(board, from, to);
  return ok;
}

export function findMoves(board: Board): Array<[Index, Index]> {
  const moves: Array<[Index, Index]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c);
      if (!board[i]) continue;
      if (c + 1 < SIZE) {
        const j = idx(r, c + 1);
        if (createsMatch(board, i, j)) moves.push([i, j]);
      }
      if (r + 1 < SIZE) {
        const j = idx(r + 1, c);
        if (createsMatch(board, i, j)) moves.push([i, j]);
      }
    }
  }
  return moves;
}

export function hasAnyMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c);
      if (!board[i]) continue;
      if (c + 1 < SIZE && createsMatch(board, i, idx(r, c + 1))) return true;
      if (r + 1 < SIZE && createsMatch(board, i, idx(r + 1, c))) return true;
    }
  }
  return false;
}

// ── Rơi ngọc & refill ──────────────────────────────────────────────────

export function gravityAndRefill(board: Board, rng: Rng): { moves: GemMove[]; spawned: GemSpawn[] } {
  const moves: GemMove[] = [];
  const spawned: GemSpawn[] = [];

  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const i = idx(r, c);
      const gem = board[i];
      if (!gem) continue;
      if (write !== r) {
        const to = idx(write, c);
        board[to] = gem;
        board[i] = null;
        moves.push({ from: i, to });
      }
      write--;
    }
    for (let r = write; r >= 0; r--) {
      const cell = makeCell(pickWeightedType(rng));
      const index = idx(r, c);
      board[index] = cell;
      spawned.push({ index, type: cell.type });
    }
  }

  return { moves, spawned };
}

/** Loại ngọc xuất hiện nhiều nhất trên bàn (dùng cho Rainbow gem). */
export function dominantType(board: Board): GemType {
  const counts = emptyCounts();
  for (const gem of board) if (gem) counts[gem.type]++;
  let best: GemType = 'ATK';
  for (const t of CONFIG.GEM_TYPES) if (counts[t] > counts[best]) best = t;
  return best;
}

// ── Shuffle ────────────────────────────────────────────────────────────

function shuffleFresh(rng: Rng): Board {
  const board = emptyBoard();
  const pool: Cell[] = [];
  for (let i = 0; i < CELLS; i++) pool.push(makeCell(pickWeightedType(rng)));
  for (let i = 0; i < CELLS; i++) board[i] = pool[i] ?? null;
  return board;
}

function emptyBoard(): Board {
  return new Array<Cell | null>(CELLS).fill(null);
}

/**
 * Xáo lại vị trí các ngọc hiện có (giữ nguyên số lượng từng loại + special),
 * đảm bảo không có match sẵn và còn nước đi.
 *
 * Không dùng "shuffle rồi kiểm tra": với 4 loại ngọc, xác suất một bàn 8x8
 * ngẫu nhiên không có match chỉ ~0.25%. Thay vào đó xếp từng ô và loại bỏ
 * ứng viên tạo run 3 — vừa giữ nguyên multiset, vừa gần như luôn thành công.
 */
export function shuffleBoard(board: Board, rng: Rng): void {
  const gems = board.filter((c): c is Cell => c !== null);
  if (gems.length !== CELLS) {
    // Bàn chưa đầy → dựng lại từ đầu để tránh trạng thái không hợp lệ.
    const fresh = createBoard(rng);
    for (let i = 0; i < CELLS; i++) board[i] = fresh[i] ?? null;
    return;
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const pool = [...gems];
    const next: Board = new Array<Cell | null>(CELLS).fill(null);

    for (let i = 0; i < CELLS; i++) {
      const candidates = pool.filter((g) => !wouldRunAt(next, i, g.type));
      if (candidates.length === 0) break;
      const chosen = candidates[randInt(rng, candidates.length)]!;
      next[i] = chosen;
      pool.splice(pool.indexOf(chosen), 1);
    }

    if (pool.length !== 0) continue; // xếp thất bại → thử lại
    if (!hasAnyMove(next)) continue;

    for (let i = 0; i < CELLS; i++) board[i] = next[i] ?? null;
    return;
  }

  const fresh = createBoard(rng);
  for (let i = 0; i < CELLS; i++) board[i] = fresh[i] ?? null;
}

/** Đặt `type` vào ô i có tạo run 3 với 2 ô bên trái / bên trên không (chỉ xét ô đã đặt). */
function wouldRunAt(board: Board, i: Index, type: GemType): boolean {
  const r = rowOf(i);
  const c = colOf(i);
  if (c >= 2 && board[idx(r, c - 1)]?.type === type && board[idx(r, c - 2)]?.type === type) return true;
  if (r >= 2 && board[idx(r - 1, c)]?.type === type && board[idx(r - 2, c)]?.type === type) return true;
  return false;
}

// ── Resolve một lượt ───────────────────────────────────────────────────

export interface ResolveOptions {
  /** Bật Rainbow gem (mặc định theo CONFIG.ENABLE_RAINBOW). */
  enableRainbow?: boolean;
  maxCascades?: number;
}

/**
 * Resolve 1 lượt: swap `from → to`, cascade, tạo ngọc đặc biệt, refill.
 * Không mutate board đầu vào.
 *
 * @param from ô người chơi kéo ngọc đi
 * @param to   ô đích — ngọc đặc biệt được tạo tại đây nếu nó nằm trong match 4/5
 */
export function resolveTurn(
  board: Board,
  from: Index,
  to: Index,
  rng: Rng,
  opts: ResolveOptions = {},
): TurnResult {
  if (!isAdjacent(from, to)) {
    return rejected(board, 'NOT_ADJACENT');
  }
  if (!board[from] || !board[to]) {
    return rejected(board, 'EMPTY_CELL');
  }

  const next = cloneBoard(board);
  swapInPlace(next, from, to);
  if (!hasMatchAt(next, from) && !hasMatchAt(next, to)) {
    return rejected(board, 'NO_MATCH');
  }
  const swapBoard = cloneBoard(next);

  const enableRainbow = opts.enableRainbow ?? CONFIG.ENABLE_RAINBOW;
  const maxCascades = opts.maxCascades ?? CONFIG.MAX_CASCADES;

  const waves: Wave[] = [];
  const counts = emptyCounts();
  let bombs = 0;
  let rainbows = 0;
  let anchor: Index | null = to;

  for (let w = 0; w < maxCascades; w++) {
    const runs = findRuns(next);
    if (runs.length === 0) break;

    const cleared = new Set<Index>();
    for (const run of runs) for (const i of run.cells) cleared.add(i);

    // Ngọc đặc biệt: run dài 4 → Bomb, >= 5 → Rainbow (fallback Bomb nếu tắt).
    const created: Array<{ index: Index; special: Special }> = [];
    const reserved = new Set<Index>();
    const byLength = [...runs].sort((a, b) => b.cells.length - a.cells.length);
    for (const run of byLength) {
      const special: Special | null =
        run.cells.length >= CONFIG.RAINBOW_MATCH_LENGTH
          ? enableRainbow
            ? 'RAINBOW'
            : 'BOMB'
          : run.cells.length >= CONFIG.BOMB_MATCH_LENGTH
            ? 'BOMB'
            : null;
      if (!special) continue;

      const spot = pickSpecialSpot(run, anchor, reserved);
      if (spot === null) continue;
      reserved.add(spot);
      created.push({ index: spot, special });
    }

    // Kích hoạt special nằm trong vùng bị xoá (nổ lan).
    const queue: Index[] = [...cleared];
    const seen = new Set<Index>(queue);
    const pushClear = (i: Index) => {
      cleared.add(i);
      if (!seen.has(i)) {
        seen.add(i);
        queue.push(i);
      }
    };

    let waveBombs = 0;
    let waveRainbows = 0;
    while (queue.length > 0) {
      const i = queue.pop()!;
      const gem = next[i];
      if (!gem || !gem.special) continue;

      if (gem.special === 'BOMB') {
        waveBombs++;
        const r = rowOf(i);
        const c = colOf(i);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
            pushClear(idx(rr, cc));
          }
        }
      } else {
        waveRainbows++;
        const target = dominantType(next);
        for (let j = 0; j < CELLS; j++) {
          if (next[j]?.type === target) pushClear(j);
        }
      }
    }

    // Ô vừa sinh special không bị xoá.
    for (const c of created) cleared.delete(c.index);

    const waveCounts = emptyCounts();
    for (const i of cleared) {
      const gem = next[i];
      if (gem) waveCounts[gem.type]++;
    }
    for (const t of CONFIG.GEM_TYPES) counts[t] += waveCounts[t];
    bombs += waveBombs;
    rainbows += waveRainbows;

    for (const i of cleared) next[i] = null;
    for (const c of created) {
      const gem = next[c.index];
      next[c.index] = makeCell(gem?.type ?? dominantType(next), c.special);
    }

    const gravity = gravityAndRefill(next, rng);
    waves.push({
      runs,
      cleared: [...cleared].sort((a, b) => a - b),
      created,
      moves: gravity.moves,
      spawned: gravity.spawned,
      board: cloneBoard(next),
      counts: waveCounts,
      bombs: waveBombs,
      rainbows: waveRainbows,
    });

    anchor = null;
  }

  // Lưới an toàn: nếu vẫn còn match sau maxCascades (gần như không thể), xáo bàn.
  let shuffled = false;
  if (findRuns(next).length > 0 || !hasAnyMove(next)) {
    shuffleBoard(next, rng);
    shuffled = true;
  }

  return {
    accepted: true,
    board: next,
    swapBoard,
    waves,
    counts,
    hits: counts.ATK,
    bombs,
    rainbows,
    cascades: waves.length,
    shuffled,
  };
}

function pickSpecialSpot(run: Run, anchor: Index | null, reserved: Set<Index>): Index | null {
  if (anchor !== null && run.cells.includes(anchor) && !reserved.has(anchor)) return anchor;
  for (const i of run.cells) if (!reserved.has(i)) return i;
  return null;
}

function rejected(board: Board, reason: RejectReason): TurnResult {
  return {
    accepted: false,
    reason,
    board: cloneBoard(board),
    swapBoard: cloneBoard(board),
    waves: [],
    counts: emptyCounts(),
    hits: 0,
    bombs: 0,
    rainbows: 0,
    cascades: 0,
    shuffled: false,
  };
}
