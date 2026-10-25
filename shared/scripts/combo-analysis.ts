/**
 * Phân tích combo / counter / "exodia" cho 20 hero.
 *
 * Cách làm:
 *   1. Sinh toàn bộ C(20,3) = 1.140 team 3 tướng.
 *   2. Mỗi team đấu với cùng một gauntlet team ngẫu nhiên (mặc định 80 team,
 *      đổi side luân phiên) để win rate so sánh được công bằng.
 *   3. Từ win rate 3-tướng suy ra C(20,4) = 4.845 combo 4 pick:
 *      - worst subset = win rate thấp nhất sau khi đối thủ ban 1 tướng
 *      - avg subset / best subset
 *   4. Pair synergy = win rate cặp − kỳ vọng từ win rate từng tướng.
 *   5. Counter matrix: A vs B với cùng 2 tướng support, quét toàn bộ support pairs.
 *
 * Chạy:
 *   node --import tsx shared/scripts/combo-analysis.ts 80 20261025
 *   npm run combo --workspace shared -- 80 20261025
 *
 * Args: gauntletSize seed
 *
 * Lưu ý: đây là bot heuristic, random draft, không phải người chơi tối ưu.
 * "Exodia" ở đây nghĩa là combo 4 pick vẫn mạnh sau khi bị ban 1 tướng.
 */
import { writeFileSync } from 'node:fs';

import { createBattle, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import { CONFIG } from '../src/config.js';
import { ROSTER } from '../src/heroes.js';
import { mulberry32 } from '../src/rng.js';
import { otherSide } from '../src/side.js';
import type { Archetype, Side } from '../src/types.js';

type Team = [Archetype, Archetype, Archetype];
type Winner = Side | 'draw' | null;

interface TeamStat {
  team: Team;
  key: string;
  wins: number;
  games: number;
}

interface PairStat {
  a: Archetype;
  b: Archetype;
  wins: number;
  games: number;
}

interface Combo4 {
  combo: Archetype[];
  worstIdx: number;
  worstTeam: Team;
  worst: number;
  worstLower: number;
  average: number;
  best: number;
  subsets: Team[];
}

interface CounterStat {
  a: Archetype;
  b: Archetype;
  wins: number;
  games: number;
}

const args = process.argv.slice(2);
const gauntletSize = Math.max(10, Math.floor(Number(args[0] ?? 80)));
const baseSeed = Math.max(0, Math.floor(Number(args[1] ?? 20261025))) >>> 0;
const archetypes = ROSTER.map((hero) => hero.archetype);

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const current: T[] = [];
  const walk = (start: number): void => {
    if (current.length === k) {
      out.push([...current]);
      return;
    }
    for (let i = start; i <= items.length - (k - current.length); i += 1) {
      current.push(items[i]!);
      walk(i + 1);
      current.pop();
    }
  };
  walk(0);
  return out;
}

function teamKey(team: readonly Archetype[]): string {
  return [...team].sort().join('|');
}

function asTeam(team: readonly Archetype[]): Team {
  return [team[0]!, team[1]!, team[2]!];
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function simulate(teamA: Team, teamB: Team, seed: number): Winner {
  const rng = mulberry32(seed >>> 0);
  const firstSide: Side = rng() < 0.5 ? 'P1' : 'P2';
  const state = createBattle(teamA, teamB, rng, undefined, firstSide);
  const secondSide = otherSide(firstSide);
  state.sides[secondSide].mana = Math.min(
    CONFIG.MANA_MAX,
    state.sides[secondSide].mana + CONFIG.SECOND_TURN_MANA_BONUS,
  );

  let guard = 0;
  while (state.winner === null && guard++ < CONFIG.MAX_TURNS * 3) {
    const action = chooseAction(state, rng);
    if (!action) break;
    playTurn(state, action, rng);
  }
  return state.winner;
}

function wilson(wins: number, games: number): [number, number] {
  if (games === 0) return [0, 0];
  const p = wins / games;
  const z = 1.96;
  const denom = 1 + (z * z) / games;
  const center = (p + (z * z) / (2 * games)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / games + (z * z) / (4 * games * games))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function teamLabel(team: readonly Archetype[]): string {
  return team.join(' + ');
}

const maybePairs = combinations(archetypes, 2);
const allTeams = combinations(archetypes, 3).map((combo): TeamStat => {
  const team = asTeam(combo);
  return { team, key: teamKey(team), wins: 0, games: 0 };
});

const rng = mulberry32(baseSeed);
const gauntlet = shuffle(allTeams, rng).slice(0, gauntletSize);
const teamByKey = new Map(allTeams.map((team) => [team.key, team]));

let matchSeed = baseSeed;
for (let i = 0; i < allTeams.length; i += 1) {
  const candidate = allTeams[i]!;
  for (let j = 0; j < gauntlet.length; j += 1) {
    const opponent = gauntlet[j]!;
    if (opponent.key === candidate.key) continue;

    const candidateIsP1 = (i + j) % 2 === 0;
    const teamA = candidateIsP1 ? candidate.team : opponent.team;
    const teamB = candidateIsP1 ? opponent.team : candidate.team;
    const winner = simulate(teamA, teamB, (matchSeed += 1009));
    if (winner === null) continue;

    candidate.games += 1;
    if (winner === (candidateIsP1 ? 'P1' : 'P2')) candidate.wins += 1;
  }
}

// Aggregate hero + pair stats from team results.
const heroStats = new Map<Archetype, { wins: number; games: number }>();
const pairStats = new Map<string, PairStat>();
for (const hero of archetypes) heroStats.set(hero, { wins: 0, games: 0 });
for (const pair of maybePairs) {
  pairStats.set(teamKey(pair), { a: pair[0]!, b: pair[1]!, wins: 0, games: 0 });
}

for (const team of allTeams) {
  for (const hero of team.team) {
    const stat = heroStats.get(hero)!;
    stat.wins += team.wins;
    stat.games += team.games;
  }
  for (let i = 0; i < 3; i += 1) {
    for (let j = i + 1; j < 3; j += 1) {
      const pair = [team.team[i]!, team.team[j]!] as const;
      const stat = pairStats.get(teamKey(pair))!;
      stat.wins += team.wins;
      stat.games += team.games;
    }
  }
}

function teamWinRate(team: TeamStat): number {
  return team.games > 0 ? team.wins / team.games : 0;
}

const rankedTeams = [...allTeams].sort((a, b) => teamWinRate(b) - teamWinRate(a));

// 4-pick combos: ban 1 -> one of four 3-hero subsets remains.
const combo4: Combo4[] = combinations(archetypes, 4).map((combo) => {
  const subsets = combo.map((_, skip) =>
    asTeam(combo.filter((_, index) => index !== skip)),
  );
  const stats = subsets.map((subset) => teamByKey.get(teamKey(subset))!);
  const rates = stats.map((stat) => teamWinRate(stat));
  const worst = Math.min(...rates);
  const worstIdx = rates.indexOf(worst);
  const lowerBounds = stats.map((stat) => wilson(stat.wins, stat.games)[0]);
  return {
    combo,
    worstIdx,
    worstTeam: subsets[worstIdx]!,
    worst,
    worstLower: Math.min(...lowerBounds),
    average: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
    best: Math.max(...rates),
    subsets,
  };
});
const rankedCombos = [...combo4].sort(
  (a, b) => b.worstLower - a.worstLower || b.worst - a.worst,
);

const pairSynergy = [...pairStats.values()]
  .map((pair) => {
    const pairRate = pair.games > 0 ? pair.wins / pair.games : 0;
    const aRate = heroStats.get(pair.a)!;
    const bRate = heroStats.get(pair.b)!;
    const expected =
      (aRate.games > 0 ? aRate.wins / aRate.games : 0) +
      (bRate.games > 0 ? bRate.wins / bRate.games : 0) -
      0.5;
    return { ...pair, pairRate, expected, synergy: pairRate - expected };
  })
  .sort((a, b) => b.synergy - a.synergy);

// Counter matrix: same two support heroes on both sides, only A vs B differs.
const counterStats: CounterStat[] = [];
let counterSeed = baseSeed ^ 0x9e3779b9;
for (const a of archetypes) {
  for (const b of archetypes) {
    if (a === b) continue;
    let wins = 0;
    let games = 0;
    for (const support of maybePairs) {
      if (support.includes(a) || support.includes(b)) continue;
      const teamA = asTeam([a, support[0]!, support[1]!]);
      const teamB = asTeam([b, support[0]!, support[1]!]);
      const winner = simulate(teamA, teamB, (counterSeed += 2003));
      if (winner === null) continue;
      games += 1;
      if (winner === 'P1') wins += 1;
    }
    counterStats.push({ a, b, wins, games });
  }
}

const counterRate = (stat: CounterStat): number =>
  stat.games > 0 ? stat.wins / stat.games : 0;
const rankedCounters = [...counterStats].sort(
  (a, b) => counterRate(b) - counterRate(a),
);

function bestWorstFor(hero: Archetype): { best: CounterStat; worst: CounterStat } {
  const rows = counterStats.filter((stat) => stat.a === hero);
  return {
    best: rows.reduce((best, row) => (counterRate(row) > counterRate(best) ? row : best)),
    worst: rows.reduce((worst, row) => (counterRate(row) < counterRate(worst) ? row : worst)),
  };
}

console.log('PRISM PACT — COMBO / COUNTER / EXODIA ANALYSIS');
console.log(
  `seed=${baseSeed} · gauntlet=${gauntletSize} team · mỗi team ~${gauntletSize} trận · ` +
    `startMana=${CONFIG.STARTING_MANA} · second-turn +${CONFIG.SECOND_TURN_MANA_BONUS} mana`,
);
console.log(
  `Tổng team 3 tướng=${allTeams.length} · combo 4 pick=${combo4.length} · ` +
    `counter matches=${counterStats.reduce((sum, stat) => sum + stat.games, 0)}`,
);
console.log('');

console.log('TOP 10 TEAM 3 TƯỚNG');
for (const [index, team] of rankedTeams.slice(0, 10).entries()) {
  const rate = teamWinRate(team);
  const [lo, hi] = wilson(team.wins, team.games);
  console.log(
    `  ${String(index + 1).padStart(2)}. ${teamLabel(team.team).padEnd(42)} ` +
      `${percent(rate).padStart(6)}  CI ${percent(lo)}–${percent(hi)}  n=${team.games}`,
  );
}
console.log('');
console.log('BOTTOM 5 TEAM 3 TƯỚNG');
for (const team of rankedTeams.slice(-5)) {
  const rate = teamWinRate(team);
  const [lo, hi] = wilson(team.wins, team.games);
  console.log(
    `     ${teamLabel(team.team).padEnd(42)} ${percent(rate).padStart(6)}  ` +
      `CI ${percent(lo)}–${percent(hi)}  n=${team.games}`,
  );
}
console.log('');

console.log('TOP 10 COMBO 4 PICK — XẾP THEO WORST SUBSET (sau khi bị ban 1)');
for (const [index, combo] of rankedCombos.slice(0, 10).entries()) {
  console.log(
    `  ${String(index + 1).padStart(2)}. ${teamLabel(combo.combo).padEnd(50)} ` +
      `worst ${percent(combo.worst).padStart(6)} (${teamLabel(combo.worstTeam)}) · ` +
      `avg ${percent(combo.average).padStart(6)} · best ${percent(combo.best).padStart(6)} · ` +
      `worst-LB ${percent(combo.worstLower)}`,
  );
}

const exodia = rankedCombos.filter(
  (combo) => combo.worstLower > 0.55 && combo.worst > 0.6,
);
console.log('');
if (exodia.length > 0) {
  console.log(`EXODIA (worst subset >60%, lower bound >55%): ${exodia.length} combo`);
  for (const combo of exodia.slice(0, 5)) {
    console.log(
      `  ${teamLabel(combo.combo)} → worst ${percent(combo.worst)} ` +
        `(${teamLabel(combo.worstTeam)}), LB ${percent(combo.worstLower)}`,
    );
  }
} else {
  console.log(
    'EXODIA: không có combo 4 pick nào đạt worst subset >60% với lower bound >55%.',
  );
  console.log(
    `  Combo ban-proof mạnh nhất: ${teamLabel(rankedCombos[0]!.combo)} → ` +
      `worst ${percent(rankedCombos[0]!.worst)}, LB ${percent(rankedCombos[0]!.worstLower)}.`,
  );
}
console.log('');

console.log('TOP 10 CẶP SYNERGY (pair winrate − kỳ vọng từ 2 tướng)');
for (const pair of pairSynergy.slice(0, 10)) {
  console.log(
    `  ${(pair.a + ' + ' + pair.b).padEnd(30)} pair ${percent(pair.pairRate).padStart(6)} · ` +
      `expected ${percent(pair.expected).padStart(6)} · ` +
      `synergy ${(pair.synergy >= 0 ? '+' : '') + (pair.synergy * 100).toFixed(1)}pp`,
  );
}
console.log('');
console.log('TOP 5 CẶP ANTI-SYNERGY');
for (const pair of pairSynergy.slice(-5).reverse()) {
  console.log(
    `  ${(pair.a + ' + ' + pair.b).padEnd(30)} pair ${percent(pair.pairRate).padStart(6)} · ` +
      `synergy ${(pair.synergy * 100).toFixed(1)}pp`,
  );
}
console.log('');

console.log('TOP 15 COUNTER (A vs B, cùng 2 support)');
for (const counter of rankedCounters.slice(0, 15)) {
  console.log(
    `  ${(counter.a + ' > ' + counter.b).padEnd(34)} ${percent(counterRate(counter)).padStart(6)} ` +
      `(n=${counter.games})`,
  );
}
console.log('');
console.log('BEST / WORST MATCHUP MỖI TƯỚNG');
for (const hero of archetypes) {
  const { best, worst } = bestWorstFor(hero);
  console.log(
    `  ${hero.padEnd(14)} best vs ${best.b.padEnd(14)} ${percent(counterRate(best)).padStart(6)} · ` +
      `worst vs ${worst.b.padEnd(14)} ${percent(counterRate(worst)).padStart(6)}`,
  );
}

const output = {
  config: {
    seed: baseSeed,
    gauntletSize,
    startingMana: CONFIG.STARTING_MANA,
    secondTurnManaBonus: CONFIG.SECOND_TURN_MANA_BONUS,
    teams: allTeams.length,
    combos4: combo4.length,
  },
  teams: rankedTeams.map((team) => ({
    team: team.team,
    wins: team.wins,
    games: team.games,
    winRate: teamWinRate(team),
    ci: wilson(team.wins, team.games),
  })),
  combos4: rankedCombos.slice(0, 100).map((combo) => ({
    combo: combo.combo,
    worstTeam: combo.worstTeam,
    worst: combo.worst,
    worstLower: combo.worstLower,
    average: combo.average,
    best: combo.best,
  })),
  pairSynergy: pairSynergy.map((pair) => ({
    a: pair.a,
    b: pair.b,
    pairRate: pair.pairRate,
    expected: pair.expected,
    synergy: pair.synergy,
  })),
  counters: counterStats.map((counter) => ({
    a: counter.a,
    b: counter.b,
    wins: counter.wins,
    games: counter.games,
    rate: counterRate(counter),
  })),
};

writeFileSync('combo-analysis.json', JSON.stringify(output, null, 2));
console.log('');
console.log('Đã ghi combo-analysis.json (full team win rates + top combos + counters).');
