/** RNG có seed — server giữ seed, client nhận kết quả. Test cần tất định. */

export type Rng = () => number;

/** mulberry32: nhanh, đủ tốt cho game, 32-bit state. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [0, maxExclusive) */
export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Fisher–Yates, tại chỗ. */
export function shuffleInPlace<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/** Chọn phần tử theo trọng số. Trả undefined nếu mảng rỗng. */
export function pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: Rng): T | undefined {
  const total = weights.reduce((s, w) => s + w, 0);
  if (items.length === 0 || total <= 0) return undefined;
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}
