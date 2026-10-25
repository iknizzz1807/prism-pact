/**
 * Thống kê số lượt của các trận bot-vs-bot.
 *
 * Chạy:
 *   npx tsx shared/scripts/turn-stats.ts 1000 draft
 *   npx tsx shared/scripts/turn-stats.ts 1000 fixed
 *   npx tsx shared/scripts/turn-stats.ts 1000 random
 *
 * mode:
 *   draft  — mô phỏng draft 2-2-2-2 + ban 1, giống flow thật
 *   fixed  — 2 đội cố định của demo (Tank/Burst/Healer vs Bruiser/Assassin/Controller)
 *   random — mỗi bên 3 tướng random, không trùng
 */
import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createBattle, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import { ROSTER } from '../src/heroes.js';
import { autoBan, autoPick, createDraft, finalTeams } from '../src/draft.js';
import type { Archetype, HeroState } from '../src/types.js';

type Mode = 'draft' | 'fixed' | 'random';

interface MatchResult {
  turns: number;
  p1Turns: number;
  p2Turns: number;
  winner: 'P1' | 'P2' | 'draw' | 'unfinished';
  suddenDeath: boolean;
  p1HpPct: number;
  p2HpPct: number;
  p1Alive: number;
  p2Alive: number;
  rejected: number;
  skillsUsed: number;
  p1Skills: number;
  p2Skills: number;
  firstSkillTurn: number | null;
  waves: number;
}

const args = process.argv.slice(2);
const matchCount = Math.max(1, Number(args[0] ?? 1000));
const mode = (args[1] ?? 'draft') as Mode;
const baseSeed = Number(args[2] ?? 20261025);
const skillChance = Math.min(1, Math.max(0, Number(args[3] ?? 0.7)));
const maxTurns = Math.max(10, Number(args[4] ?? CONFIG.MAX_TURNS));
const sdPct = Math.min(1, Math.max(0, Number(args[5] ?? CONFIG.SUDDEN_DEATH_HP_PCT)));
const hpScale = Math.max(0.1, Number(args[6] ?? 1));
const atkScale = Math.max(0.1, Number(args[7] ?? 1));
const healScale = Math.max(0, Number(args[8] ?? 1));
const damageCap = Math.max(1, Number(args[9] ?? CONFIG.DAMAGE_CAP_HITS));
const atkWeight = Math.min(0.9, Math.max(0.05, Number(args[10] ?? CONFIG.GEM_SPAWN_WEIGHT.ATK)));
const startMana = Math.max(0, Number(args[11] ?? CONFIG.STARTING_MANA));
const manaPerGem = Math.max(0, Number(args[12] ?? CONFIG.MANA_PER_GEM));
const skillCostScale = Math.max(0.1, Number(args[13] ?? 1));
const skillCdScale = Math.max(0.1, Number(args[14] ?? 1));

// Cho phép thử nhanh các knob cân bằng mà không sửa config gốc.
(CONFIG as unknown as { MAX_TURNS: number }).MAX_TURNS = maxTurns;
(CONFIG as unknown as { SUDDEN_DEATH_HP_PCT: number }).SUDDEN_DEATH_HP_PCT = sdPct;
(CONFIG as unknown as { DAMAGE_CAP_HITS: number }).DAMAGE_CAP_HITS = damageCap;
(CONFIG as unknown as { HEAL_PCT_PER_GEM: number }).HEAL_PCT_PER_GEM *= healScale;
(CONFIG as unknown as { SHIELD_PCT_PER_GEM: number }).SHIELD_PCT_PER_GEM *= healScale;

const rest = (1 - atkWeight) / 3;
(CONFIG as unknown as { GEM_SPAWN_WEIGHT: Record<string, number> }).GEM_SPAWN_WEIGHT = {
  ATK: atkWeight,
  HP: rest,
  MANA: rest,
  SHIELD: rest,
};

(CONFIG as unknown as { MANA_PER_GEM: number }).MANA_PER_GEM = manaPerGem;
for (const hero of ROSTER as unknown as Array<{
  hp: number;
  atk: number;
  skill: { mana: number; cd: number };
}>) {
  hero.hp = Math.round(hero.hp * hpScale);
  hero.atk = Math.round(hero.atk * atkScale);
  hero.skill.mana = Math.round(hero.skill.mana * skillCostScale);
  hero.skill.cd = Math.max(1, Math.round(hero.skill.cd * skillCdScale));
}

function sampleTeam(rng: () => number): Archetype[] {
  const pool = ROSTER.map((h) => h.archetype);
  const picked: Archetype[] = [];
  while (picked.length < 3) {
    const i = Math.floor(rng() * pool.length);
    const [hero] = pool.splice(i, 1);
    if (hero) picked.push(hero);
  }
  return picked;
}

function hpPct(heroes: readonly HeroState[]): number {
  const max = heroes.reduce((sum, h) => sum + h.maxHp, 0);
  const cur = heroes.reduce((sum, h) => sum + Math.max(0, h.hp), 0);
  return max > 0 ? (cur / max) * 100 : 0;
}

function runMatch(seed: number): MatchResult | null {
  const rng = mulberry32(seed);
  let p1: Archetype[];
  let p2: Archetype[];

  if (mode === 'fixed') {
    p1 = ['Tank', 'Burst', 'Healer'];
    p2 = ['Bruiser', 'Assassin', 'Controller'];
  } else if (mode === 'random') {
    p1 = sampleTeam(rng);
    p2 = sampleTeam(rng);
  } else {
    const draft = createDraft(rng() < 0.5 ? 'P1' : 'P2');
    let draftGuard = 0;
    while (draft.phase === 'pick' && draftGuard++ < 20) autoPick(draft, rng);
    autoBan(draft, 'P1', rng);
    autoBan(draft, 'P2', rng);
    const teams = finalTeams(draft);
    p1 = teams.P1;
    p2 = teams.P2;
  }

  if (p1.length !== 3 || p2.length !== 3) return null;

  const state = createBattle(
    p1 as [Archetype, Archetype, Archetype],
    p2 as [Archetype, Archetype, Archetype],
    rng,
  );
  state.sides.P1.mana = startMana;
  state.sides.P2.mana = startMana;

  let rejected = 0;
  let skillsUsed = 0;
  let p1Skills = 0;
  let p2Skills = 0;
  let firstSkillTurn: number | null = null;
  let waves = 0;
  let guard = 0;
  while (state.winner === null && guard++ < CONFIG.MAX_TURNS * 3) {
    const action = chooseAction(state, rng, { skillChance });
    if (!action) break;
    const report = playTurn(state, action, rng);
    if (!report.accepted) {
      rejected++;
      continue;
    }
    if (report.logs.some((line) => line.includes(' dùng '))) {
      skillsUsed++;
      if (report.side === 'P1') p1Skills++;
      else p2Skills++;
      if (firstSkillTurn === null) firstSkillTurn = report.turn + 1;
    }
    if (report.animation) waves += report.animation.waves.length;
  }

  const winner: MatchResult['winner'] =
    state.winner === null ? 'unfinished' : state.winner;

  return {
    turns: state.turn,
    p1Turns: Math.ceil(state.turn / 2),
    p2Turns: Math.floor(state.turn / 2),
    winner,
    suddenDeath: state.suddenDeath,
    p1HpPct: hpPct(state.sides.P1.heroes),
    p2HpPct: hpPct(state.sides.P2.heroes),
    p1Alive: state.sides.P1.heroes.filter((h) => h.alive).length,
    p2Alive: state.sides.P2.heroes.filter((h) => h.alive).length,
    rejected,
    skillsUsed,
    p1Skills,
    p2Skills,
    firstSkillTurn,
    waves,
  };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

function summary(name: string, values: number[]): string {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
  const median = quantile(sorted, 0.5);
  const p10 = quantile(sorted, 0.1);
  const p90 = quantile(sorted, 0.9);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  return `${name.padEnd(14)} mean ${mean.toFixed(1).padStart(5)} · median ${median
    .toFixed(0)
    .padStart(3)} · p10 ${p10.toFixed(0).padStart(3)} · p90 ${p90
    .toFixed(0)
    .padStart(3)} · min ${min} · max ${max}`;
}

const started = Date.now();
const results: MatchResult[] = [];
for (let i = 0; i < matchCount; i++) {
  const result = runMatch(baseSeed + i);
  if (result) results.push(result);
}

const turns = results.map((r) => r.turns);
const p1Turns = results.map((r) => r.p1Turns);
const p2Turns = results.map((r) => r.p2Turns);
const sudden = results.filter((r) => r.suddenDeath).length;
const nonSuddenTurns = results.filter((r) => !r.suddenDeath).map((r) => r.turns);
const suddenTurns = results.filter((r) => r.suddenDeath).map((r) => r.turns);
const unfinished = results.filter((r) => r.winner === 'unfinished').length;
const draws = results.filter((r) => r.winner === 'draw').length;
const p1Wins = results.filter((r) => r.winner === 'P1').length;
const p2Wins = results.filter((r) => r.winner === 'P2').length;

console.log('PRISM PACT — BOT VS BOT TURN STATS');
console.log(
  `mode=${mode} · matches=${results.length}/${matchCount} · seed=${baseSeed} · skillChance=${skillChance} · MAX_TURNS=${maxTurns} · SD=${(sdPct * 100).toFixed(0)}%/turn · HP×${hpScale} · ATK×${atkScale} · heal×${healScale} · cap=${damageCap} · ATKgem=${(atkWeight * 100).toFixed(0)}% · startMana=${startMana} · mana/gem=${manaPerGem} · skillCost×${skillCostScale} · skillCD×${skillCdScale}`,
);
console.log('');
console.log(summary('Tổng lượt/trận', turns));
console.log(summary('Lượt P1', p1Turns));
console.log(summary('Lượt P2', p2Turns));
if (nonSuddenTurns.length > 0) console.log(summary('Kết thúc thường', nonSuddenTurns));
if (suddenTurns.length > 0) console.log(summary('Có SuddenDeath', suddenTurns));
console.log('');
console.log(
  `Sudden Death: ${((sudden / results.length) * 100).toFixed(1)}% (${sudden}/${results.length})`,
);
console.log(
  `Winner: P1 ${((p1Wins / results.length) * 100).toFixed(1)}% · P2 ${(
    (p2Wins / results.length) *
    100
  ).toFixed(1)}% · draw ${((draws / results.length) * 100).toFixed(1)}% · unfinished ${unfinished}`,
);
console.log(
  `HP còn lại trung bình: P1 ${(results.reduce((s, r) => s + r.p1HpPct, 0) / results.length).toFixed(
    1,
  )}% · P2 ${(results.reduce((s, r) => s + r.p2HpPct, 0) / results.length).toFixed(1)}%`,
);
console.log(
  `Hero còn sống trung bình: P1 ${(results.reduce((s, r) => s + r.p1Alive, 0) / results.length).toFixed(
    2,
  )}/3 · P2 ${(results.reduce((s, r) => s + r.p2Alive, 0) / results.length).toFixed(2)}/3`,
);
console.log(`Rejected swaps: ${results.reduce((s, r) => s + r.rejected, 0)}`);

const totalSkills = results.reduce((s, r) => s + r.skillsUsed, 0);
const totalP1Skills = results.reduce((s, r) => s + r.p1Skills, 0);
const totalP2Skills = results.reduce((s, r) => s + r.p2Skills, 0);
const totalTurns = results.reduce((s, r) => s + r.turns, 0);
const firstSkillTurns = results
  .map((r) => r.firstSkillTurn)
  .filter((v): v is number => v !== null);
console.log('');
console.log(
  `Skill: ${(totalSkills / results.length).toFixed(2)} lần/trận · P1 ${(
    totalP1Skills / results.length
  ).toFixed(2)} · P2 ${(totalP2Skills / results.length).toFixed(2)} · ${(
    (totalSkills / Math.max(1, totalTurns)) *
    100
  ).toFixed(1)}% số lượt có skill`,
);
console.log(
  `Skill lần đầu: mean ${(
    firstSkillTurns.reduce((s, v) => s + v, 0) / Math.max(1, firstSkillTurns.length)
  ).toFixed(1)} · median ${quantile([...firstSkillTurns].sort((a, b) => a - b), 0.5).toFixed(0)} · ${
    firstSkillTurns.length
  }/${results.length} trận có dùng skill`,
);

const totalWaves = results.reduce((s, r) => s + r.waves, 0);
const avgWaves = totalWaves / Math.max(1, totalTurns);
const animSeconds = Math.min(9, 0.9 + 0.85 * avgWaves);
console.log(
  `Wave/trận: ${(totalWaves / results.length).toFixed(2)} · wave/lượt: ${avgWaves.toFixed(
    2,
  )} · animation ước tính: ${animSeconds.toFixed(2)}s/lượt`,
);

const buckets = new Map<string, number>();
for (const t of turns) {
  const lower = t <= 10 ? '1-10' : t <= 20 ? '11-20' : t <= 30 ? '21-30' : t <= 40 ? '31-40' : t <= 50 ? '41-50' : '51+';
  buckets.set(lower, (buckets.get(lower) ?? 0) + 1);
}
console.log('');
console.log('Phân bố tổng lượt:');
for (const key of ['1-10', '11-20', '21-30', '31-40', '41-50', '51+']) {
  const count = buckets.get(key) ?? 0;
  const pct = (count / results.length) * 100;
  console.log(`  ${key.padEnd(6)} ${String(count).padStart(5)}  ${pct.toFixed(1).padStart(5)}%  ${'█'.repeat(Math.round(pct / 2))}`);
}

const avgTurns = turns.reduce((s, v) => s + v, 0) / results.length;
console.log('');
console.log(
  `Ước lượng thời gian (chỉ tính lượt, không tính animation): 20s/lượt → ${Math.floor(
    (avgTurns * 20) / 60,
  )}m${Math.round((avgTurns * 20) % 60)}s · 10s/lượt → ${Math.floor(
    (avgTurns * 10) / 60,
  )}m${Math.round((avgTurns * 10) % 60)}s · 5s/lượt → ${Math.floor(
    (avgTurns * 5) / 60,
  )}m${Math.round((avgTurns * 5) % 60)}s`,
);
console.log(`Thời gian chạy mô phỏng: ${((Date.now() - started) / 1000).toFixed(1)}s`);
