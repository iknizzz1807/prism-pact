/**
 * Dump một bộ state Prism Pact để test Kev (System One) local.
 * Chạy:
 *   node --import tsx shared/scripts/dump-kev-states.ts
 * Output: kev-states.json
 *
 * Lưu ý: đây là state tổng hợp cho test model, không phải replay nguyên trạng.
 */
import { writeFileSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createBattle, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import { canUseSkill, effectiveSkillCost } from '../src/skills.js';
import { heroDef } from '../src/heroes.js';
import { otherSide } from '../src/side.js';
import type { BattleState } from '../src/battle.js';
import type { Archetype, Buff, HeroState, Side } from '../src/types.js';

type Scenario = 'early' | 'finish' | 'sustain' | 'charge' | 'cleanse' | 'setup';

const ROLE: Record<Archetype, string> = {
  Tank: 'tank/taunt',
  Burst: 'single-target burst',
  Healer: 'team heal',
  Controller: 'ATK-down/DoT-down',
  Buffer: 'team ATK + shield',
  Debuffer: 'DEF shred',
  Assassin: 'lowest-HP finisher',
  Bruiser: 'lifesteal bruiser',
  Paladin: 'invincible / DEF aura',
  Juggernaut: 'thorns tank',
  Executioner: 'anti-tank true damage',
  Sniper: 'shield bypass',
  Cleaver: 'AoE cleave',
  Berserker: 'risk bruiser',
  Pyromancer: 'burn DoT',
  Venomancer: 'AoE poison',
  Necromancer: 'summoner',
  Oracle: 'heal + cleanse',
  Chronarch: 'cooldown tempo',
  Spellbreaker: 'mana drain / tax',
};

/** Bản dịch tiếng Anh ngắn — Kev-0.8B chỉ được train tiếng Anh. */
const SKILL_EN: Record<string, string> = {
  Taunt: 'Force all enemy attacks to target this hero for 1 turn.',
  Nuke: 'Deal 3x ATK to one target.',
  'Mass Heal': 'Heal the whole team for 40% max HP.',
  Weaken: 'Reduce target ATK by 50% for 2 turns; gain 10 mana.',
  Rally: 'Give team +30% ATK and 20% max HP shield for 2 turns.',
  Strip: 'Reduce target DEF by 50% for 2 turns.',
  Execute: 'Deal 2.5x ATK, ignore 50% DEF, hit the lowest-HP enemy.',
  'Lifesteal Strike': 'Deal 2x ATK and heal 50% of damage dealt.',
  'Divine Aegis': 'Give one ally Invincible for 1 turn. Once per match.',
  'Iron Thorns': 'For 2 turns, reflect 40% of basic damage and gain +20% DEF.',
  Sever: 'Deal 1.8x ATK + 12% max HP true damage, ignore 40% DEF.',
  Deadshot: 'Deal 2.4x ATK, ignore shield; +30% if target has shield.',
  Amputation: 'Deal 1.3x ATK to all enemies; +10% per living enemy.',
  Ignite: 'Deal 1.2x ATK and apply Burn 4% max HP/turn for 2 turns.',
  'Toxic Miasma': 'Apply Poison 3% max HP/turn to all enemies for 2 turns; ignores shield.',
  Mend: 'Heal the lowest-HP ally for 35% max HP and cleanse 1 debuff.',
  'Raise Thrall': 'Summon a 280 HP / 54 ATK Thrall that strikes the committed target.',
  'Time Warp': 'Add +1 cooldown to all enemy skills (cap +2); reduce one ally cooldown by 1.',
  'Mana Drain': 'Burn 25 enemy mana, gain 15 mana, and strip 1 buff.',
  'Reckless Swing': 'Deal 2.2x ATK, lose 10% current HP (non-lethal), gain +25% ATK for 2 turns.',
};

const LETTER: Record<string, string> = { ATK: 'A', HP: 'H', MANA: 'M', SHIELD: 'S' };

function boardRows(state: BattleState): string[] {
  const rows: string[] = [];
  for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
    const row: string[] = [];
    for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
      const cell = state.board[r * CONFIG.BOARD_SIZE + c];
      if (!cell) {
        row.push('.');
        continue;
      }
      const mark = cell.special === 'BOMB' ? '*' : cell.special === 'RAINBOW' ? '^' : '';
      row.push(`${LETTER[cell.type] ?? '?'}${mark}`);
    }
    rows.push(row.join(' '));
  }
  return rows;
}

function counts(state: BattleState): Record<string, number> {
  const out: Record<string, number> = { ATK: 0, HP: 0, MANA: 0, SHIELD: 0 };
  for (const cell of state.board) if (cell) out[cell.type] = (out[cell.type] ?? 0) + 1;
  return out;
}

function buffText(buffs: Buff[]): Array<{ kind: Buff['kind']; pct: number; turns: number }> {
  return buffs.map((b) => ({ kind: b.kind, pct: b.pct, turns: b.turns }));
}

function heroInfo(hero: HeroState): object {
  return {
    uid: hero.uid,
    hero: hero.archetype,
    role: ROLE[hero.archetype],
    hp: hero.hp,
    maxHp: hero.maxHp,
    hpPct: Math.round((hero.hp / hero.maxHp) * 100),
    atk: hero.atk,
    def: hero.def,
    shield: hero.shield,
    alive: hero.alive,
    cdRemaining: hero.cd,
    buffs: buffText(hero.buffs),
  };
}

function teamInfo(state: BattleState, side: Side): object {
  const s = state.sides[side];
  const totalMax = s.heroes.reduce((sum, h) => sum + h.maxHp, 0);
  const totalHp = s.heroes.reduce((sum, h) => sum + h.hp, 0);
  const alive = s.heroes.filter((h) => h.alive);
  const dotPct = s.heroes.reduce(
    (sum, h) =>
      h.alive
        ? sum +
          h.buffs
            .filter((b) => b.kind === 'BURN' || b.kind === 'POISON')
            .reduce((s2, b) => s2 + b.pct, 0)
        : sum,
    0,
  );
  return {
    side,
    mana: s.mana,
    heroes: s.heroes.map(heroInfo),
    aliveCount: alive.length,
    deadUids: s.heroes.filter((h) => !h.alive).map((h) => h.uid),
    teamHpPct: Math.round((totalHp / Math.max(1, totalMax)) * 100),
    teamDotPct: Math.round(dotPct * 100),
    thrall: s.thrall,
  };
}

function legalSkills(state: BattleState, side: Side): object[] {
  const s = state.sides[side];
  const enemies = state.sides[otherSide(side)].heroes;
  return s.heroes
    .filter((h) => h.alive)
    .map((hero) => {
      const def = heroDef(hero.archetype);
      const cost = effectiveSkillCost(hero, s.heroes, enemies);
      const reason = canUseSkill(hero, s.mana, false, cost);
      return {
        uid: hero.uid,
        hero: hero.archetype,
        skill: def.skill.name,
        descEn: SKILL_EN[def.skill.name] ?? def.skill.desc,
        manaCost: cost,
        baseManaCost: def.skill.mana,
        cdRemaining: hero.cd,
        cdLength: def.skill.cd,
        targetType: def.skill.target ?? 'enemy',
        legal: reason === null,
        reason,
      };
    });
}

function snapshot(id: string, label: string, state: BattleState, scenario: Scenario): object {
  const active = state.active;
  const enemySide = otherSide(active);
  const c = counts(state);
  const top = Math.max(...Object.values(c));
  const majority = Object.entries(c)
    .filter(([, n]) => n === top)
    .map(([type]) => type);
  return {
    id,
    label,
    scenario,
    state: {
      game: 'Prism Pact',
      turn: state.turn,
      active,
      suddenDeath: state.suddenDeath,
      board: {
        rows: boardRows(state),
        counts: c,
        legend: 'A=ATK H=HP M=MANA S=SHIELD; *=bomb on that gem; ^=rainbow on that gem; .=empty',
      },
      you: teamInfo(state, active),
      enemy: teamInfo(state, enemySide),
      legalSkills: legalSkills(state, active),
      enemyTargets: state.sides[enemySide].heroes.filter((h) => h.alive).map(heroInfo),
      allyTargets: state.sides[active].heroes.filter((h) => h.alive).map(heroInfo),
      boardMajority: majority,
      boardMajorityTie: majority.length > 1,
    },
  };
}

function playToTurn(state: BattleState, targetTurn: number, seed: number): void {
  const rng = mulberry32(seed);
  let guard = 0;
  while (state.winner === null && state.turn < targetTurn && guard++ < 100) {
    const action = chooseAction(state, rng);
    if (!action) break;
    playTurn(state, action, rng);
    // Giữ Debuffer/allies sống cho scenario; nếu có hero chết, dừng sớm.
    if (state.sides.P1.heroes.some((h) => !h.alive)) break;
  }
}

function setHp(heroes: HeroState[], pct: number): void {
  for (const h of heroes) {
    if (!h.alive) continue;
    h.hp = Math.max(1, Math.round(h.maxHp * pct));
  }
}

function resetState(state: BattleState): void {
  for (const side of ['P1', 'P2'] as Side[]) {
    for (const h of state.sides[side].heroes) {
      h.buffs = [];
      h.shield = 0;
      h.cd = 0;
    }
  }
}

function make(scenario: Scenario, seed: number, index: number): object {
  const rng = mulberry32(seed);
  const teams: Record<Scenario, [Archetype[], Archetype[]]> = {
    early: [
      ['Tank', 'Berserker', 'Oracle'],
      ['Juggernaut', 'Pyromancer', 'Spellbreaker'],
    ],
    finish: [
      ['Tank', 'Berserker', 'Oracle'],
      ['Juggernaut', 'Pyromancer', 'Spellbreaker'],
    ],
    sustain: [
      ['Tank', 'Berserker', 'Oracle'],
      ['Cleaver', 'Pyromancer', 'Spellbreaker'],
    ],
    charge: [
      ['Tank', 'Berserker', 'Oracle'],
      ['Juggernaut', 'Pyromancer', 'Spellbreaker'],
    ],
    cleanse: [
      ['Tank', 'Berserker', 'Oracle'],
      ['Pyromancer', 'Venomancer', 'Controller'],
    ],
    setup: [
      ['Debuffer', 'Spellbreaker', 'Berserker'],
      ['Paladin', 'Buffer', 'Juggernaut'],
    ],
  };

  const [p1, p2] = teams[scenario];
  const state = createBattle(
    p1 as [Archetype, Archetype, Archetype],
    p2 as [Archetype, Archetype, Archetype],
    rng,
  );

  const targetTurn: Record<Scenario, number> = {
    early: 2,
    finish: 10,
    sustain: 12,
    charge: 8,
    cleanse: 10,
    setup: 8,
  };
  playToTurn(state, targetTurn[scenario], seed + 100);

  if (state.winner !== null || state.sides.P1.heroes.some((h) => !h.alive)) {
    const fresh = createBattle(
      p1 as [Archetype, Archetype, Archetype],
      p2 as [Archetype, Archetype, Archetype],
      mulberry32(seed + 999),
    );
    Object.assign(state, fresh);
    playToTurn(state, 2, seed + 199);
  }

  // Synthetic test state: P1 turn, no stale buffs, even turn.
  state.active = 'P1';
  state.winner = null;
  state.suddenDeath = false;
  state.turn = Math.max(2, state.turn + (state.turn % 2));
  resetState(state);

  if (scenario === 'early') {
    setHp(state.sides.P1.heroes, 1);
    setHp(state.sides.P2.heroes, 1);
    state.sides.P1.mana = 50;
    state.sides.P2.mana = 25;
  } else if (scenario === 'finish') {
    setHp(state.sides.P1.heroes, 0.8);
    setHp(state.sides.P2.heroes, 0.7);
    const target = state.sides.P2.heroes.find((h) => h.alive);
    if (target) target.hp = Math.max(1, Math.round(target.maxHp * 0.1));
    state.sides.P1.mana = 60;
  } else if (scenario === 'sustain') {
    setHp(state.sides.P1.heroes, 0.28);
    setHp(state.sides.P2.heroes, 0.9);
    state.sides.P1.mana = 55;
  } else if (scenario === 'charge') {
    setHp(state.sides.P1.heroes, 0.7);
    setHp(state.sides.P2.heroes, 0.8);
    state.sides.P1.mana = 30;
  } else if (scenario === 'cleanse') {
    // Heavy DoT + mid HP: cleanse is clearly the urgent play.
    setHp(state.sides.P1.heroes, 0.5);
    setHp(state.sides.P2.heroes, 0.8);
    state.sides.P1.mana = 45;
    const [tank, zerk] = state.sides.P1.heroes;
    if (tank) {
      tank.buffs.push({ kind: 'BURN', pct: 0.04, turns: 2 });
      tank.buffs.push({ kind: 'BURN', pct: 0.04, turns: 2 });
    }
    if (zerk) {
      zerk.buffs.push({ kind: 'POISON', pct: 0.03, turns: 2 });
      zerk.buffs.push({ kind: 'POISON', pct: 0.03, turns: 2 });
    }
  } else if (scenario === 'setup') {
    setHp(state.sides.P1.heroes, 0.75);
    setHp(state.sides.P2.heroes, 0.75);
    state.sides.P1.mana = 50;
    for (const h of state.sides.P2.heroes) {
      if (!h.alive) continue;
      h.shield = Math.round(h.maxHp * 0.2);
      h.buffs.push({ kind: 'DEF_UP', pct: 0.2, turns: 2 });
    }
  }

  return snapshot(`s${index}-${scenario}`, scenario, state, scenario);
}

const states: object[] = [];
let index = 0;
for (const scenario of ['early', 'finish', 'sustain', 'charge', 'cleanse', 'setup'] as Scenario[]) {
  for (const seed of [2026, 777]) states.push(make(scenario, seed, index++));
}

writeFileSync('kev-states.json', JSON.stringify(states, null, 2), 'utf8');
console.log(`Wrote kev-states.json with ${states.length} states.`);
