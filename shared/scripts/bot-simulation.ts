/**
 * Mô phỏng 1.000 trận bot-vs-bot thuần heuristic (không Jev/System One).
 *
 * Thời gian là THỜI GIAN LOGIC, không sleep thật:
 *   - mỗi lượt battle: bot "suy nghĩ" 80–90% TURN_TIME_MS
 *   - mỗi pick draft: 80–90% DRAFT_PICK_TIME_MS
 *   - mỗi ban: 80–90% DRAFT_BAN_TIME_MS
 *   - cộng animation budget giống server: min(9s, 0.9s + 0.85s × wave)
 *
 * Chạy:
 *   node --import tsx shared/scripts/bot-simulation.ts 1000 20261025 0.8 0.9 0.7
 *   npm run sim --workspace shared -- 1000 20261025 0.8 0.9 0.7
 *
 * Args: matches seed minUse maxUse skillChance
 */
import { createBattle, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import { CONFIG } from '../src/config.js';
import { autoBan, autoPick, createDraft, finalTeams } from '../src/draft.js';
import { ROSTER } from '../src/heroes.js';
import type { BattleState } from '../src/battle.js';
import { mulberry32 } from '../src/rng.js';
import type { Archetype, HeroState, Side } from '../src/types.js';

type Winner = Side | 'draw' | 'unfinished';

interface MatchResult {
  turns: number;
  winner: Winner;
  suddenDeath: boolean;
  skills: number;
  p1Skills: number;
  p2Skills: number;
  firstSkillTurn: number | null;
  rejected: number;
  damage: number;
  healed: number;
  hits: number;
  waves: number;
  p1HpPct: number;
  p2HpPct: number;
  p1Alive: number;
  p2Alive: number;
  firstPick: Side;
  battleFirst: Side;
  draftMs: number;
  battleThinkingMs: number;
  battleAnimationMs: number;
  battleWallMs: number;
  fullWallMs: number;
  p1Team: Archetype[];
  p2Team: Archetype[];
  p1Picks: Archetype[];
  p2Picks: Archetype[];
  p1Bans: Archetype[];
  p2Bans: Archetype[];
  skillsByHero: Map<Archetype, number>;
}

interface HeroAgg {
  picks: number;
  bans: number;
  apps: number;
  wins: number;
  skills: number;
}

interface Stats {
  n: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  min: number;
  max: number;
}

const ANIMATION_MAX_MS = 9000;
const ANIMATION_BASE_MS = 900;
const ANIMATION_PER_WAVE_MS = 850;
// Client pick/ban animation chạy overlap với timer kế tiếp; đây chỉ là tham khảo.
const PICK_ANIM_MS = 320;
const BAN_REVEAL_MS = 2200;

const args = process.argv.slice(2);
const requestedMatches = Math.floor(Number(args[0] ?? 1000));
const matchCount = Number.isFinite(requestedMatches)
  ? Math.max(1, requestedMatches)
  : 1000;
const requestedSeed = Math.floor(Number(args[1] ?? 20261025));
const baseSeed = (Number.isFinite(requestedSeed) ? Math.max(0, requestedSeed) : 20261025) >>> 0;
const minUse = clamp(Number(args[2] ?? 0.8), 0, 1);
const maxUse = Math.max(minUse, clamp(Number(args[3] ?? 0.9), 0, 1));
const skillChance = clamp(Number(args[4] ?? 0.7), 0, 1);

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function sampleUse(rng: () => number): number {
  return minUse + (maxUse - minUse) * rng();
}

function hpPct(heroes: readonly HeroState[]): number {
  const max = heroes.reduce((sum, h) => sum + h.maxHp, 0);
  const current = heroes.reduce((sum, h) => sum + Math.max(0, h.hp), 0);
  return max > 0 ? (current / max) * 100 : 0;
}

function runMatch(seed: number): MatchResult | null {
  const rng = mulberry32(seed);
  const timeRng = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  const firstPick: Side = rng() < 0.5 ? 'P1' : 'P2';
  const draft = createDraft(firstPick);
  let draftMs = 0;

  while (draft.phase === 'pick') {
    const picked = autoPick(draft, rng);
    if (!picked) break;
    draftMs += sampleUse(timeRng) * CONFIG.DRAFT_PICK_TIME_MS;
  }

  // Ban 2 bên diễn ra song song: thời gian là max, không phải tổng.
  const banP1 = autoBan(draft, 'P1', rng);
  const banP1Ms = banP1 ? sampleUse(timeRng) * CONFIG.DRAFT_BAN_TIME_MS : 0;
  const banP2 = autoBan(draft, 'P2', rng);
  const banP2Ms = banP2 ? sampleUse(timeRng) * CONFIG.DRAFT_BAN_TIME_MS : 0;
  draftMs += Math.max(banP1Ms, banP2Ms);

  const teams = finalTeams(draft);
  if (teams.P1.length !== 3 || teams.P2.length !== 3) return null;

  const state: BattleState = createBattle(
    teams.P1 as [Archetype, Archetype, Archetype],
    teams.P2 as [Archetype, Archetype, Archetype],
    rng,
  );
  state.sides.P1.mana = CONFIG.STARTING_MANA;
  state.sides.P2.mana = CONFIG.STARTING_MANA;

  const battleFirst = state.active;
  let battleThinkingMs = 0;
  let battleAnimationMs = 0;
  let skills = 0;
  let p1Skills = 0;
  let p2Skills = 0;
  let firstSkillTurn: number | null = null;
  let rejected = 0;
  let damage = 0;
  let healed = 0;
  let hits = 0;
  let waves = 0;
  const skillsByHero = new Map<Archetype, number>();

  let guard = 0;
  while (state.winner === null && guard++ < CONFIG.MAX_TURNS * 3) {
    const action = chooseAction(state, rng, { skillChance });
    if (!action) break;
    const report = playTurn(state, action, rng);
    if (!report.accepted) {
      rejected += 1;
      continue;
    }

    battleThinkingMs += sampleUse(timeRng) * CONFIG.TURN_TIME_MS;
    const waveCount = report.animation?.waves.length ?? 0;
    battleAnimationMs += Math.min(
      ANIMATION_MAX_MS,
      ANIMATION_BASE_MS + ANIMATION_PER_WAVE_MS * waveCount,
    );

    damage += report.damage;
    healed += report.healed;
    hits += report.hits;
    waves += waveCount;

    if (report.logs.some((line) => line.includes(' dùng '))) {
      skills += 1;
      if (report.side === 'P1') p1Skills += 1;
      else p2Skills += 1;
      if (firstSkillTurn === null) firstSkillTurn = report.turn + 1;

      const casterUid = action.skill?.casterUid;
      if (casterUid) {
        const caster = state.sides[report.side].heroes.find((h) => h.uid === casterUid);
        if (caster) {
          skillsByHero.set(caster.archetype, (skillsByHero.get(caster.archetype) ?? 0) + 1);
        }
      }
    }
  }

  const battleWallMs = battleThinkingMs + battleAnimationMs;

  return {
    turns: state.turn,
    winner: state.winner ?? 'unfinished',
    suddenDeath: state.suddenDeath,
    skills,
    p1Skills,
    p2Skills,
    firstSkillTurn,
    rejected,
    damage,
    healed,
    hits,
    waves,
    p1HpPct: hpPct(state.sides.P1.heroes),
    p2HpPct: hpPct(state.sides.P2.heroes),
    p1Alive: state.sides.P1.heroes.filter((h) => h.alive).length,
    p2Alive: state.sides.P2.heroes.filter((h) => h.alive).length,
    firstPick,
    battleFirst,
    draftMs,
    battleThinkingMs,
    battleAnimationMs,
    battleWallMs,
    fullWallMs: draftMs + battleWallMs,
    p1Team: [...teams.P1],
    p2Team: [...teams.P2],
    p1Picks: [...draft.picks.P1],
    p2Picks: [...draft.picks.P2],
    p1Bans: [...draft.bans.P1],
    p2Bans: [...draft.bans.P2],
    skillsByHero,
  };
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

function stats(values: readonly number[]): Stats {
  if (values.length === 0) {
    return { n: 0, mean: 0, median: 0, p90: 0, p95: 0, min: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    n: values.length,
    mean,
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m${String(seconds).padStart(2, '0')}s`;
}

function pct(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0.0%';
}

function printStats(
  label: string,
  value: Stats,
  formatter: (n: number) => string,
): void {
  console.log(
    `${label.padEnd(24)} mean ${formatter(value.mean).padStart(9)} · median ${formatter(
      value.median,
    ).padStart(9)} · p90 ${formatter(value.p90).padStart(9)} · p95 ${formatter(
      value.p95,
    ).padStart(9)} · min ${formatter(value.min).padStart(9)} · max ${formatter(
      value.max,
    ).padStart(9)}`,
  );
}

const simStart = performance.now();
const results: MatchResult[] = [];
for (let i = 0; i < matchCount; i++) {
  const result = runMatch((baseSeed + i) >>> 0);
  if (result) results.push(result);
}
const simMs = performance.now() - simStart;
const matches = results.length;

const battleFirst = results[0]?.battleFirst ?? 'P1';
const battleSecond = battleFirst === 'P1' ? 'P2' : 'P1';
const p1Wins = results.filter((r) => r.winner === 'P1').length;
const p2Wins = results.filter((r) => r.winner === 'P2').length;
const draws = results.filter((r) => r.winner === 'draw').length;
const unfinished = results.filter((r) => r.winner === 'unfinished').length;
const sudden = results.filter((r) => r.suddenDeath).length;

const firstPickWins = results.filter((r) => r.winner === r.firstPick).length;
const secondPickWins = results.filter(
  (r) =>
    r.winner !== 'draw' &&
    r.winner !== 'unfinished' &&
    r.winner !== r.firstPick,
).length;
const firstPickP1 = results.filter((r) => r.firstPick === 'P1');
const firstPickP2 = results.filter((r) => r.firstPick === 'P2');
const p1WinsWhenFirstPick = firstPickP1.filter((r) => r.winner === 'P1').length;
const p1WinsWhenSecondPick = firstPickP2.filter((r) => r.winner === 'P1').length;
const p2WinsWhenFirstPick = firstPickP2.filter((r) => r.winner === 'P2').length;
const p2WinsWhenSecondPick = firstPickP1.filter((r) => r.winner === 'P2').length;

const turns = stats(results.map((r) => r.turns));
const skills = stats(results.map((r) => r.skills));
const battleThinking = stats(results.map((r) => r.battleThinkingMs));
const battleWall = stats(results.map((r) => r.battleWallMs));
const fullWall = stats(results.map((r) => r.fullWallMs));
const draftTime = stats(results.map((r) => r.draftMs));

const totalTurns = results.reduce((sum, r) => sum + r.turns, 0);
const totalSkills = results.reduce((sum, r) => sum + r.skills, 0);
const totalP1Skills = results.reduce((sum, r) => sum + r.p1Skills, 0);
const totalP2Skills = results.reduce((sum, r) => sum + r.p2Skills, 0);
const firstSkillTurns = results
  .map((r) => r.firstSkillTurn)
  .filter((value): value is number => value !== null);

const totalDamage = results.reduce((sum, r) => sum + r.damage, 0);
const totalHealed = results.reduce((sum, r) => sum + r.healed, 0);
const totalHits = results.reduce((sum, r) => sum + r.hits, 0);
const totalWaves = results.reduce((sum, r) => sum + r.waves, 0);

const heroAgg = new Map<Archetype, HeroAgg>();
for (const hero of ROSTER) {
  heroAgg.set(hero.archetype, { picks: 0, bans: 0, apps: 0, wins: 0, skills: 0 });
}

for (const result of results) {
  for (const hero of [...result.p1Picks, ...result.p2Picks]) {
    const agg = heroAgg.get(hero);
    if (agg) agg.picks += 1;
  }
  for (const hero of [...result.p1Bans, ...result.p2Bans]) {
    const agg = heroAgg.get(hero);
    if (agg) agg.bans += 1;
  }
  for (const [hero, count] of result.skillsByHero) {
    const agg = heroAgg.get(hero);
    if (agg) agg.skills += count;
  }

  const p1Won = result.winner === 'P1';
  const p2Won = result.winner === 'P2';
  for (const hero of result.p1Team) {
    const agg = heroAgg.get(hero);
    if (agg) {
      agg.apps += 1;
      if (p1Won) agg.wins += 1;
    }
  }
  for (const hero of result.p2Team) {
    const agg = heroAgg.get(hero);
    if (agg) {
      agg.apps += 1;
      if (p2Won) agg.wins += 1;
    }
  }
}

const heroRows = [...heroAgg.entries()]
  .map(([hero, agg]) => ({
    hero,
    ...agg,
    winRate: agg.apps > 0 ? (agg.wins / agg.apps) * 100 : 0,
    pickRate: matches > 0 ? (agg.picks / matches) * 100 : 0,
    banRate: matches > 0 ? (agg.bans / matches) * 100 : 0,
    playRate: matches > 0 ? (agg.apps / matches) * 100 : 0,
  }))
  .sort((a, b) => b.winRate - a.winRate || b.apps - a.apps || a.hero.localeCompare(b.hero));

const topPicked = [...heroRows].sort((a, b) => b.picks - a.picks).slice(0, 5);
const topBanned = [...heroRows].sort((a, b) => b.bans - a.bans).slice(0, 5);

const turnBuckets = new Map<string, number>();
for (const value of results.map((r) => r.turns)) {
  const bucket =
    value <= 10
      ? '1-10'
      : value <= 20
        ? '11-20'
        : value <= 30
          ? '21-30'
          : value <= 40
            ? '31-40'
            : value <= 50
              ? '41-50'
              : '51+';
  turnBuckets.set(bucket, (turnBuckets.get(bucket) ?? 0) + 1);
}

console.log('PRISM PACT — 1000 BOT VS BOT (HEURISTIC ONLY)');
console.log(
  `seed=${baseSeed} · matches=${matches}/${matchCount} · bot=heuristic · skillChance=${skillChance.toFixed(
    2,
  )} · turnUse=${(minUse * 100).toFixed(0)}–${(maxUse * 100).toFixed(0)}% · TURN_MS=${
    CONFIG.TURN_TIME_MS
  }`,
);
console.log(
  `Draft: pick ${(CONFIG.DRAFT_PICK_TIME_MS / 1000).toFixed(0)}s tuần tự, ban ${
    (CONFIG.DRAFT_BAN_TIME_MS / 1000
  ).toFixed(0)}s song song — cũng dùng ${(minUse * 100).toFixed(0)}–${(maxUse * 100).toFixed(
    0,
  )}% timer.`,
);
console.log('Không gọi Jev/System One. Thời gian là mô phỏng logic, không sleep thật.');
console.log('');

console.log('WIN / PICK ORDER');
console.log(
  `  Winner: P1 ${pct(p1Wins, matches)} · P2 ${pct(p2Wins, matches)} · draw ${pct(
    draws,
    matches,
  )} · unfinished ${unfinished}`,
);
console.log(
  `  Battle first (${battleFirst}) ${pct(p1Wins, matches)} · second (${battleSecond}) ${pct(
    p2Wins,
    matches,
  )}` + '  (createBattle luôn cho P1 đi trước)',
);
console.log(
  `  Draft first-pick side thắng ${pct(firstPickWins, matches)} · second-pick side thắng ${pct(
    secondPickWins,
    matches,
  )}`,
);
console.log(
  `  P1 pick trước: ${firstPickP1.length} trận, P1 thắng ${pct(
    p1WinsWhenFirstPick,
    firstPickP1.length,
  )} · P2 thắng ${pct(p2WinsWhenSecondPick, firstPickP1.length)}`,
);
console.log(
  `  P2 pick trước: ${firstPickP2.length} trận, P2 thắng ${pct(
    p2WinsWhenFirstPick,
    firstPickP2.length,
  )} · P1 thắng ${pct(p1WinsWhenSecondPick, firstPickP2.length)}`,
);
console.log(`  Sudden Death: ${pct(sudden, matches)} (${sudden}/${matches})`);
console.log('');

console.log('TURNS / SKILLS');
printStats('Tổng lượt/trận', turns, formatNumber);
printStats('Skill/trận', skills, formatNumber);
console.log(
  `  Skill: P1 ${(totalP1Skills / Math.max(1, matches)).toFixed(2)}/trận · P2 ${(
    totalP2Skills / Math.max(1, matches)
  ).toFixed(2)}/trận · ${pct(totalSkills, totalTurns)} số lượt có skill`,
);
if (firstSkillTurns.length > 0) {
  const firstSkillStats = stats(firstSkillTurns);
  console.log(
    `  Skill lần đầu: mean lượt ${firstSkillStats.mean.toFixed(1)} · median ${firstSkillStats.median.toFixed(
      0,
    )} · ${firstSkillTurns.length}/${matches} trận có skill`,
  );
}
console.log('');

console.log('COMBAT');
console.log(
  `  Damage/trận ${(totalDamage / Math.max(1, matches)).toFixed(0)} · Heal/trận ${(
    totalHealed / Math.max(1, matches)
  ).toFixed(0)} · Hit/trận ${(totalHits / Math.max(1, matches)).toFixed(
    1,
  )} · Wave/trận ${(totalWaves / Math.max(1, matches)).toFixed(2)}`,
);
console.log(
  `  HP còn lại: P1 ${(
    results.reduce((sum, r) => sum + r.p1HpPct, 0) / Math.max(1, matches)
  ).toFixed(1)}% · P2 ${(
    results.reduce((sum, r) => sum + r.p2HpPct, 0) / Math.max(1, matches)
  ).toFixed(1)}%`,
);
console.log(
  `  Hero sống: P1 ${(
    results.reduce((sum, r) => sum + r.p1Alive, 0) / Math.max(1, matches)
  ).toFixed(2)}/3 · P2 ${(
    results.reduce((sum, r) => sum + r.p2Alive, 0) / Math.max(1, matches)
  ).toFixed(2)}/3`,
);
console.log(`  Rejected swaps: ${results.reduce((sum, r) => sum + r.rejected, 0)}`);
console.log('');

console.log('TIME (LOGIC)');
printStats('Draft timer (pick/ban)', draftTime, formatDuration);
printStats('Battle thinking (80-90%)', battleThinking, formatDuration);
printStats('Battle + animation', battleWall, formatDuration);
printStats('Full match (draft+battle)', fullWall, formatDuration);
console.log(
  `  Battle animation/trận: ${(
    results.reduce((sum, r) => sum + r.battleAnimationMs, 0) /
    Math.max(1, matches) /
    1000
  ).toFixed(1)}s (đã cộng trong Battle + animation và Full match)`,
);
const serialDraftAnimMs = CONFIG.PICKS_PER_SIDE * 2 * PICK_ANIM_MS + BAN_REVEAL_MS;
console.log(
  `  Pick/ban animation: ~${(PICK_ANIM_MS / 1000).toFixed(2)}s/pick + reveal ${(
    BAN_REVEAL_MS / 1000
  ).toFixed(1)}s — chạy overlap timer kế tiếp nên KHÔNG cộng vào Full match.`,
);
console.log(
  `  Nếu cộng cứng worst-case: +${(serialDraftAnimMs / 1000).toFixed(
    1,
  )}s/trận → full mean ${formatDuration(fullWall.mean + serialDraftAnimMs)}.`,
);
console.log('');

console.log('TURN DISTRIBUTION');
for (const bucket of ['1-10', '11-20', '21-30', '31-40', '41-50', '51+']) {
  const count = turnBuckets.get(bucket) ?? 0;
  const percent = (count / Math.max(1, matches)) * 100;
  console.log(
    `  ${bucket.padEnd(6)} ${String(count).padStart(5)}  ${percent.toFixed(1).padStart(5)}%  ${'█'.repeat(
      Math.round(percent / 2),
    )}`,
  );
}
console.log('');

console.log('HEROES (final team = 3 tướng ra trận)');
console.log(
  'Hero'.padEnd(15) +
    'Apps'.padStart(6) +
    'Wins'.padStart(6) +
    'Win%'.padStart(8) +
    'Pick'.padStart(6) +
    'Ban'.padStart(5) +
    'Pick%'.padStart(7) +
    'Ban%'.padStart(7) +
    'Play%'.padStart(7) +
    'Skill'.padStart(7),
);
for (const row of heroRows) {
  console.log(
    row.hero.padEnd(15) +
      String(row.apps).padStart(6) +
      String(row.wins).padStart(6) +
      `${row.winRate.toFixed(1)}%`.padStart(8) +
      String(row.picks).padStart(6) +
      String(row.bans).padStart(5) +
      `${row.pickRate.toFixed(1)}%`.padStart(7) +
      `${row.banRate.toFixed(1)}%`.padStart(7) +
      `${row.playRate.toFixed(1)}%`.padStart(7) +
      String(row.skills).padStart(7),
  );
}
console.log('');
console.log(
  `Top pick: ${topPicked.map((r) => `${r.hero} ${r.picks}`).join(' · ')}`,
);
console.log(
  `Top ban:  ${topBanned.map((r) => `${r.hero} ${r.bans}`).join(' · ')}`,
);
console.log('');
console.log(
  `Thời gian chạy mô phỏng thật: ${(simMs / 1000).toFixed(2)}s (không sleep ${formatDuration(
    fullWall.mean,
  )}/trận).`,
);
