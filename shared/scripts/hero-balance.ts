/**
 * Đo pick/ban/win rate từng hero qua bot-vs-bot draft ngẫu nhiên.
 *
 * Chạy:
 *   node --import tsx shared/scripts/hero-balance.ts 5000
 */
import { readFileSync } from 'node:fs';

import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createBattle, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import { ROSTER } from '../src/heroes.js';
import { autoBan, autoPick, createDraft, finalTeams } from '../src/draft.js';
import { otherSide } from '../src/side.js';
import type { Archetype, Side } from '../src/types.js';

interface BalanceOverride {
  hp?: number;
  atk?: number;
  def?: number;
  skillMana?: number;
  skillCd?: number;
}

interface HeroStat {
  picked: number;
  banned: number;
  fielded: number;
  wins: number;
  losses: number;
  draws: number;
  p1Fielded: number;
  p1Wins: number;
  p2Fielded: number;
  p2Wins: number;
}

const args = process.argv.slice(2);
const matchCount = Math.max(1, Number(args[0] ?? 5000));
const baseSeed = Number(args[1] ?? 20261025);
const overridePath = args[2];
const p2ManaBonus = Math.max(0, Number(args[3] ?? 0));
const p2HpPct = Math.max(1, Number(args[4] ?? 1));
const battleFirstMode = (args[5] ?? 'p1') as 'p1' | 'p2' | 'random' | 'secondPick';
const startMana = Math.max(0, Number(args[6] ?? CONFIG.STARTING_MANA));
const manaPerGem = Math.max(0, Number(args[7] ?? CONFIG.MANA_PER_GEM));

(CONFIG as unknown as { STARTING_MANA: number }).STARTING_MANA = startMana;
(CONFIG as unknown as { MANA_PER_GEM: number }).MANA_PER_GEM = manaPerGem;

if (overridePath) {
  const overrides = JSON.parse(readFileSync(overridePath, 'utf8')) as Record<
    string,
    BalanceOverride
  >;
  for (const hero of ROSTER as unknown as Array<{
    archetype: Archetype;
    hp: number;
    atk: number;
    def: number;
    skill: { mana: number; cd: number };
  }>) {
    const override = overrides[hero.archetype];
    if (!override) continue;
    if (override.hp !== undefined) hero.hp = override.hp;
    if (override.atk !== undefined) hero.atk = override.atk;
    if (override.def !== undefined) hero.def = override.def;
    if (override.skillMana !== undefined) hero.skill.mana = override.skillMana;
    if (override.skillCd !== undefined) hero.skill.cd = override.skillCd;
  }
}

const stats = new Map<Archetype, HeroStat>();
for (const hero of ROSTER) {
  stats.set(hero.archetype, {
    picked: 0,
    banned: 0,
    fielded: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    p1Fielded: 0,
    p1Wins: 0,
    p2Fielded: 0,
    p2Wins: 0,
  });
}

function add(hero: Archetype, fn: (s: HeroStat) => void): void {
  const s = stats.get(hero);
  if (s) fn(s);
}

let totalTurns = 0;
let suddenDeath = 0;
let p1Wins = 0;
let p2Wins = 0;
let draws = 0;
let skillUses = 0;

for (let i = 0; i < matchCount; i++) {
  const rng = mulberry32(baseSeed + i);
  const draft = createDraft(rng() < 0.5 ? 'P1' : 'P2');

  let guard = 0;
  while (draft.phase === 'pick' && guard++ < 20) autoPick(draft, rng);
  autoBan(draft, 'P1', rng);
  autoBan(draft, 'P2', rng);

  for (const side of ['P1', 'P2'] as Side[]) {
    for (const hero of draft.picks[side]) add(hero, (s) => (s.picked += 1));
  }
  for (const side of ['P1', 'P2'] as Side[]) {
    for (const hero of draft.bans[side]) add(hero, (s) => (s.banned += 1));
  }

  const teams = finalTeams(draft);
  const p1 = teams.P1 as [Archetype, Archetype, Archetype];
  const p2 = teams.P2 as [Archetype, Archetype, Archetype];
  if (p1.length !== 3 || p2.length !== 3) continue;

  const state = createBattle(p1, p2, rng);
  if (battleFirstMode === 'p2') state.active = 'P2';
  else if (battleFirstMode === 'random') state.active = rng() < 0.5 ? 'P1' : 'P2';
  else if (battleFirstMode === 'secondPick') {
    state.active = otherSide(draft.pickOrder[0]!);
  }
  if (p2ManaBonus > 0) {
    state.sides.P2.mana = Math.min(CONFIG.MANA_MAX, state.sides.P2.mana + p2ManaBonus);
  }
  if (p2HpPct !== 1) {
    for (const hero of state.sides.P2.heroes) {
      hero.maxHp = Math.round(hero.maxHp * p2HpPct);
      hero.hp = hero.maxHp;
    }
  }
  let rejected = 0;
  let battleGuard = 0;
  while (state.winner === null && battleGuard++ < CONFIG.MAX_TURNS * 3) {
    const action = chooseAction(state, rng);
    if (!action) break;
    const report = playTurn(state, action, rng);
    if (!report.accepted) rejected++;
    if (report.logs.some((line) => line.includes(' dùng '))) skillUses++;
  }

  totalTurns += state.turn;
  if (state.suddenDeath) suddenDeath++;
  if (state.winner === 'P1') p1Wins++;
  else if (state.winner === 'P2') p2Wins++;
  else draws++;

  for (const side of ['P1', 'P2'] as Side[]) {
    const won = state.winner === side;
    for (const hero of teams[side]) {
      add(hero, (s) => {
        s.fielded += 1;
        if (won) s.wins += 1;
        else if (state.winner === 'draw') s.draws += 1;
        else s.losses += 1;
        if (side === 'P1') {
          s.p1Fielded += 1;
          if (won) s.p1Wins += 1;
        } else {
          s.p2Fielded += 1;
          if (won) s.p2Wins += 1;
        }
      });
    }
  }
}

/** Wilson 95% interval cho tỷ lệ thắng. */
function wilson(wins: number, total: number): [number, number] {
  if (total === 0) return [0, 0];
  const p = wins / total;
  const z = 1.96;
  const denom = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

const rows = [...stats.entries()].map(([hero, s]) => {
  const decided = s.wins + s.losses;
  const winRate = decided > 0 ? s.wins / decided : 0;
  const [lo, hi] = wilson(s.wins, decided);
  return { hero, ...s, winRate, lo, hi };
});

console.log(
  `PRISM PACT — HERO BALANCE (${matchCount} trận, seed ${baseSeed}` +
    `${overridePath ? `, overrides=${overridePath}` : ''}` +
    `${p2ManaBonus > 0 ? `, P2 +${p2ManaBonus} mana` : ''}` +
    `${p2HpPct !== 1 ? `, P2 HP×${p2HpPct}` : ''}` +
    `${battleFirstMode !== 'p1' ? `, battleFirst=${battleFirstMode}` : ''}` +
    `, startMana=${startMana}, manaGem=${manaPerGem})`,
);
console.log(
  `Tổng lượt mean ${(totalTurns / matchCount).toFixed(1)} · SD ${((suddenDeath / matchCount) * 100).toFixed(1)}% · ` +
    `P1 ${((p1Wins / matchCount) * 100).toFixed(1)}% · P2 ${((p2Wins / matchCount) * 100).toFixed(1)}% · draw ${((draws / matchCount) * 100).toFixed(1)}% · ` +
    `skill ${(skillUses / matchCount).toFixed(2)}/trận`,
);
console.log('');
console.log('Hero           Field  Pick  Ban   Win%   95% CI          P1 win  P2 win');
console.log('─'.repeat(78));

for (const r of rows.sort((a, b) => b.winRate - a.winRate)) {
  const p1Rate = r.p1Fielded > 0 ? (r.p1Wins / r.p1Fielded) * 100 : 0;
  const p2Rate = r.p2Fielded > 0 ? (r.p2Wins / r.p2Fielded) * 100 : 0;
  console.log(
    `${r.hero.padEnd(14)} ${String(r.fielded).padStart(5)} ${String(r.picked).padStart(5)} ${String(r.banned).padStart(5)} ` +
      `${(r.winRate * 100).toFixed(1).padStart(6)}  ${(r.lo * 100).toFixed(1)}–${(r.hi * 100).toFixed(1)}%`.padEnd(24) +
      ` ${p1Rate.toFixed(1).padStart(6)}  ${p2Rate.toFixed(1).padStart(6)}`,
  );
}

console.log('');
console.log('Gợi ý đọc: fielded = số lần vào sân; win% chỉ tính trận thắng/thua (bỏ draw).');
console.log('CI 95%: nếu khoảng không chứa 50% → có tín hiệu lệch balance.');
