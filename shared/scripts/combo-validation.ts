/**
 * Validate top team/combo từ combo-analysis.json bằng mọi thứ tự slot.
 *
 * - Top 3-hero team: thử cả 6 permutation, đấu 200 team random.
 * - Top 4-pick combo: thử cả 24 pick order × 4 ban, đấu 100 team random.
 *
 * Chạy:
 *   node --import tsx shared/scripts/combo-validation.ts 20261025 200
 */
import { readFileSync } from 'node:fs';

import { createBattle, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import { CONFIG } from '../src/config.js';
import { ROSTER } from '../src/heroes.js';
import { mulberry32 } from '../src/rng.js';
import { otherSide } from '../src/side.js';
import type { Archetype, Side } from '../src/types.js';

type Team = [Archetype, Archetype, Archetype];
type Winner = Side | 'draw' | null;

interface AnalysisData {
  combos4: Array<{ combo: Archetype[]; worst: number; worstLower: number }>;
  teams: Array<{ team: Team; winRate: number }>;
}

const args = process.argv.slice(2);
const seed = Math.max(0, Math.floor(Number(args[0] ?? 20261025))) >>> 0;
const opponentCount = Math.max(20, Math.floor(Number(args[1] ?? 200)));
const data = JSON.parse(readFileSync('combo-analysis.json', 'utf8')) as AnalysisData;
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

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i]!, ...tail]);
  }
  return out;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function asTeam(team: readonly Archetype[]): Team {
  return [team[0]!, team[1]!, team[2]!];
}

function simulate(teamA: Team, teamB: Team, matchSeed: number): Winner {
  const rng = mulberry32(matchSeed >>> 0);
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

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function label(team: readonly Archetype[]): string {
  return team.join(' + ');
}

const rng = mulberry32(seed ^ 0x9e3779b9);
const allTeams = combinations(archetypes, 3).map((team) => asTeam(team));
const opponents = shuffle(allTeams, rng)
  .slice(0, opponentCount)
  .map((team) => shuffle(team, mulberry32(seed ^ 0x85ebca6b)) as Team);

function evaluate(team: Team, matchCount: number): { wins: number; games: number } {
  let wins = 0;
  let games = 0;
  let matchSeed = (seed + team[0].length * 1009 + matchCount * 7919) >>> 0;
  for (const opponent of opponents.slice(0, matchCount)) {
    const winner = simulate(team, opponent, (matchSeed += 1009));
    if (winner === null) continue;
    games += 1;
    if (winner === 'P1') wins += 1;
  }
  return { wins, games };
}

console.log(
  `VALIDATE TOP COMBOS · seed=${seed} · opponents=${opponentCount} · ` +
    `second-turn +${CONFIG.SECOND_TURN_MANA_BONUS} mana`,
);
console.log('');

console.log('TOP 3-HERO TEAMS — mọi thứ tự slot');
for (const row of data.teams.slice(0, 5)) {
  const results = permutations(row.team).map((order) => {
    const team = asTeam(order);
    const result = evaluate(team, opponentCount);
    return { order: team, ...result, rate: result.games ? result.wins / result.games : 0 };
  });
  const best = results.reduce((a, b) => (b.rate > a.rate ? b : a));
  const average = results.reduce((sum, result) => sum + result.rate, 0) / results.length;
  const [lo, hi] = wilson(best.wins, best.games);
  console.log(
    `  ${label(row.team).padEnd(42)} best ${pct(best.rate).padStart(6)} ` +
      `[${label(best.order)}] CI ${pct(lo)}–${pct(hi)} · avg-order ${pct(average)}`,
  );
}
console.log('');

console.log('TOP 4-PICK COMBOS — 24 pick order × 4 ban');
for (const row of data.combos4.slice(0, 5)) {
  const orders = permutations(row.combo);
  let bestOrder: { order: Archetype[]; worst: number; worstSubset: Team; worstRate: number; avg: number } | null =
    null;

  for (const order of orders) {
    const subsetResults = order.map((_, banIndex) => {
      const subset = asTeam(order.filter((_, index) => index !== banIndex));
      const result = evaluate(subset, Math.min(100, opponentCount));
      return { subset, rate: result.games ? result.wins / result.games : 0 };
    });
    const worst = subsetResults.reduce((a, b) => (b.rate < a.rate ? b : a));
    const avg =
      subsetResults.reduce((sum, result) => sum + result.rate, 0) /
      subsetResults.length;
    if (!bestOrder || worst.rate > bestOrder.worst) {
      bestOrder = {
        order,
        worst: worst.rate,
        worstSubset: worst.subset,
        worstRate: worst.rate,
        avg,
      };
    }
  }

  if (bestOrder) {
    console.log(
      `  ${label(row.combo).padEnd(50)} best pick order ${label(bestOrder.order).padEnd(
        50,
      )} worst ${pct(bestOrder.worstRate).padStart(6)} (${label(bestOrder.worstSubset)}) ` +
        `avg ${pct(bestOrder.avg)}`,
    );
  }
}
console.log('');
console.log(
  'Ghi chú: nếu worst subset <60% sau khi thử mọi thứ tự → không phải exodia thật.',
);
