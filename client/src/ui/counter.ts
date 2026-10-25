import type { Archetype } from '@prism-pact/shared';

export type CounterVerdict = 'good' | 'bad';

/** README 4.9 — chỉ để gợi ý trong UI, server không dùng matrix này. */
const MATRIX: Partial<Record<Archetype, Partial<Record<Archetype, CounterVerdict>>>> = {
  Tank: { Burst: 'good', Bruiser: 'good' },
  Burst: { Tank: 'bad', Healer: 'bad', Controller: 'good', Buffer: 'good', Debuffer: 'good' },
  Healer: { Tank: 'good', Burst: 'good', Buffer: 'good', Bruiser: 'good', Assassin: 'bad' },
  Controller: { Tank: 'good', Burst: 'good', Healer: 'good', Assassin: 'good' },
  Buffer: { Tank: 'bad', Healer: 'good', Bruiser: 'good', Debuffer: 'bad' },
  Debuffer: { Tank: 'good', Healer: 'good', Buffer: 'good' },
  Assassin: { Burst: 'bad', Healer: 'good', Buffer: 'good' },
  Bruiser: { Tank: 'good', Controller: 'good', Debuffer: 'good', Healer: 'bad', Assassin: 'bad' },
  Paladin: { Burst: 'good', Assassin: 'good', Executioner: 'bad', Spellbreaker: 'bad' },
  Juggernaut: { Assassin: 'good', Burst: 'good', Controller: 'bad', Pyromancer: 'bad' },
  Executioner: { Tank: 'good', Paladin: 'good', Juggernaut: 'good', Healer: 'bad', Assassin: 'bad' },
  Sniper: { Buffer: 'good', Paladin: 'good', Tank: 'bad', Juggernaut: 'bad' },
  Cleaver: { Assassin: 'good', Healer: 'good', Paladin: 'bad', Tank: 'bad' },
  Pyromancer: { Healer: 'good', Venomancer: 'good', Oracle: 'bad', Tank: 'bad' },
  Venomancer: { Healer: 'good', Bruiser: 'good', Oracle: 'bad', Assassin: 'bad' },
  Oracle: { Debuffer: 'good', Pyromancer: 'good', Venomancer: 'good', Assassin: 'bad' },
};

export interface CounterInfo {
  good: Archetype[];
  bad: Archetype[];
}

export function countersFor(archetype: Archetype): CounterInfo {
  const row = MATRIX[archetype] ?? {};
  const good: Archetype[] = [];
  const bad: Archetype[] = [];
  for (const [target, verdict] of Object.entries(row) as Array<[Archetype, CounterVerdict]>) {
    if (verdict === 'good') good.push(target);
    else bad.push(target);
  }
  return { good, bad };
}

/** Gợi ý pick dựa trên các tướng địch đã lộ, ưu tiên tướng còn trong pool. */
export function suggestAgainst(enemies: readonly Archetype[], pool: readonly Archetype[]): Archetype[] {
  const scores = new Map<Archetype, number>();
  for (const candidate of pool) {
    let score = 0;
    for (const enemy of enemies) {
      const verdict = MATRIX[candidate]?.[enemy];
      if (verdict === 'good') score += 2;
      if (verdict === 'bad') score -= 2;
    }
    if (score > 0) scores.set(candidate, score);
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([archetype]) => archetype);
}
