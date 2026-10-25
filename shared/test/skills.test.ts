import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canUseSkill, useSkill } from '../src/skills.js';
import {
  buffPct,
  dealDamage,
  effectiveAtk,
  effectiveDef,
  forcedTarget,
  mitigated,
  performBasicAttacks,
} from '../src/combat.js';
import { createTeam } from '../src/heroes.js';

const p1 = () => createTeam(['Tank', 'Burst', 'Healer'], 'P1');
const p2 = () => createTeam(['Tank', 'Burst', 'Healer'], 'P2');

function near(actual: number, expected: number, eps = 1e-9): void {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !≈ ${expected}`);
}

describe('skill validation', () => {
  it('thiếu mana → NO_MANA', () => {
    const allies = p1();
    const out = useSkill({ caster: allies[1]!, allies, enemies: p2(), mana: 39 });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'NO_MANA');
  });

  it('đang cooldown → ON_COOLDOWN', () => {
    const allies = p1();
    const caster = allies[1]!;
    const enemies = p2();
    const first = useSkill({ caster, allies, enemies, mana: 100 });
    assert.equal(first.ok, true);

    const second = useSkill({ caster, allies, enemies, mana: 100 });
    assert.equal(second.ok, false);
    assert.equal(second.reason, 'ON_COOLDOWN');
    assert.equal(caster.cd, 3);
  });

  it('đã dùng skill trong lượt → ALREADY_USED', () => {
    const allies = p1();
    const out = useSkill({
      caster: allies[1]!,
      allies,
      enemies: p2(),
      mana: 100,
      alreadyUsedThisTurn: true,
    });
    assert.equal(out.reason, 'ALREADY_USED');
  });

  it('tướng chết → DEAD', () => {
    const allies = p1();
    allies[1]!.alive = false;
    assert.equal(canUseSkill(allies[1]!, 100), 'DEAD');
  });

  it('không còn mục tiêu → NO_TARGET', () => {
    const allies = p1();
    const enemies = p2();
    for (const h of enemies) h.alive = false;
    const out = useSkill({ caster: allies[1]!, allies, enemies, mana: 100 });
    assert.equal(out.reason, 'NO_TARGET');
  });
});

describe('8 skill', () => {
  it('Burst / Nuke: 3× ATK lên target', () => {
    const allies = p1();
    const caster = allies[1]!;
    const enemies = p2();
    const target = enemies[0]!;
    const before = target.hp;

    const out = useSkill({ caster, allies, enemies, mana: 40, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.equal(out.mana, 0);
    assert.equal(out.cd, 3);
    assert.equal(out.targetUid, target.uid);

    const raw = 3 * effectiveAtk(caster, allies);
    const expected = mitigated(raw, effectiveDef(target));
    assert.equal(out.damage, expected);
    assert.equal(target.hp, before - expected);
  });

  it('Healer / Mass Heal: hồi 40% maxHP, cap ở maxHP', () => {
    const allies = p1();
    const healer = allies[2]!;
    allies[0]!.hp = allies[0]!.maxHp - 200;
    allies[1]!.hp = allies[1]!.maxHp - 100;

    const out = useSkill({ caster: healer, allies, enemies: p2(), mana: 48 });

    assert.equal(out.ok, true);
    assert.equal(out.healed, 300);
    assert.equal(allies[0]!.hp, allies[0]!.maxHp);
    assert.equal(allies[1]!.hp, allies[1]!.maxHp);
    assert.equal(allies[2]!.hp, allies[2]!.maxHp);
    assert.equal(out.mana, 0);
  });

  it('Controller / Weaken: -50% ATK, -25% DoT 2 lượt, passive +10 mana', () => {
    const controllerTeam = createTeam(['Tank', 'Controller', 'Healer'], 'P1');
    const controller = controllerTeam[1]!;
    const enemies = p2();
    const target = enemies[0]!;

    const before = effectiveAtk(target, enemies);
    const out = useSkill({
      caster: controller,
      allies: controllerTeam,
      enemies,
      mana: 32,
      targetUid: target.uid,
    });

    assert.equal(out.ok, true);
    assert.equal(out.mana, 10); // 32 - 32 + 10
    near(effectiveAtk(target, enemies), before / 2);
    assert.equal(target.buffs.filter((b) => b.kind === 'ATK_DOWN').length, 1);
    assert.equal(target.buffs.filter((b) => b.kind === 'DOT_DOWN').length, 1);
    assert.equal(target.buffs[0]!.turns, 2);
  });

  it('Buffer / Rally: +30% ATK và shield 20% maxHP cho cả đội', () => {
    const team = createTeam(['Tank', 'Buffer', 'Healer'], 'P1');
    const buffer = team[1]!;

    const out = useSkill({ caster: buffer, allies: team, enemies: p2(), mana: 50 });

    assert.equal(out.ok, true);
    for (const hero of team) {
      assert.ok(hero.buffs.some((b) => b.kind === 'ATK_UP' && b.pct === 0.3));
    }
    for (const hero of team) {
      assert.equal(hero.shield, Math.ceil(hero.maxHp * 0.2));
    }
  });

  it('Debuffer / Strip: -50% DEF 2 lượt', () => {
    const team = createTeam(['Tank', 'Debuffer', 'Healer'], 'P1');
    const debuffer = team[1]!;
    const enemies = p2();
    const target = enemies[0]!;
    const before = effectiveDef(target);

    const out = useSkill({ caster: debuffer, allies: team, enemies, mana: 40, targetUid: target.uid });

    assert.equal(out.ok, true);
    near(effectiveDef(target), before / 2);
  });

  it('Assassin / Execute: chọn target HP% thấp nhất, bỏ qua 50% DEF', () => {
    const team = createTeam(['Assassin', 'Tank', 'Healer'], 'P1');
    const assassin = team[0]!;
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const burst = enemies[1]!;
    burst.hp = 200; // 22% → thấp nhất

    const out = useSkill({ caster: assassin, allies: team, enemies, mana: 50 });

    assert.equal(out.ok, true);
    assert.equal(out.targetUid, burst.uid);
    assert.equal(burst.alive, false);
    assert.equal(out.damage, 200, 'damage bị cap bởi HP còn lại');
  });

  it('Bruiser / Lifesteal Strike: 2× ATK, hồi 50% damage', () => {
    const team = createTeam(['Bruiser', 'Tank', 'Healer'], 'P1');
    const bruiser = team[0]!;
    bruiser.hp = Math.round(bruiser.maxHp * 0.8);
    const before = bruiser.hp;
    const enemies = p2();
    const target = enemies[0]!;

    const out = useSkill({ caster: bruiser, allies: team, enemies, mana: 36, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.ok(out.damage > 0);
    const expectedHeal = Math.round(out.damage * 0.5);
    assert.equal(out.healed, expectedHeal);
    assert.equal(bruiser.hp, before + expectedHeal);
  });

  it('Tank / Taunt: ép target của địch về mình', () => {
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const tank = team[0]!;

    const out = useSkill({ caster: tank, allies: team, enemies: p2(), mana: 32 });

    assert.equal(out.ok, true);
    assert.equal(forcedTarget(team)?.uid, tank.uid);
    assert.equal(out.mana, 0);
  });
});

describe('P1 heroes', () => {
  it('Paladin / Divine Aegis: Invincible 1 lượt, 1 lần/trận', () => {
    const team = createTeam(['Paladin', 'Tank', 'Healer'], 'P1');
    const paladin = team[0]!;
    const target = team[1]!;
    target.hp = 100;

    const out = useSkill({
      caster: paladin,
      allies: team,
      enemies: p2(),
      mana: 40,
      targetUid: target.uid,
    });

    assert.equal(out.ok, true);
    assert.ok(target.buffs.some((b) => b.kind === 'INVINCIBLE' && b.turns === 1));
    assert.equal(out.mana, 0);
    assert.equal(paladin.onceUsed.includes('DIVINE_AEGIS'), true);

    const before = target.hp;
    assert.equal(dealDamage(target, 9999), 0, 'Invincible chặn damage trực tiếp');
    assert.equal(target.hp, before);

    paladin.cd = 0;
    assert.equal(canUseSkill(paladin, 100), 'USED_ONCE');
  });

  it('Juggernaut / Iron Thorns: phản damage basic + DEF_UP', () => {
    const team = createTeam(['Juggernaut', 'Tank', 'Healer'], 'P2');
    const jug = team[0]!;

    const out = useSkill({ caster: jug, allies: team, enemies: p1(), mana: 36 });
    assert.equal(out.ok, true);
    assert.ok(jug.buffs.some((b) => b.kind === 'THORNS' && b.turns === 2));
    assert.ok(jug.buffs.some((b) => b.kind === 'DEF_UP' && b.pct === 0.2));

    const attackers = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const attackerHp = attackers[0]!.hp;
    const out2 = performBasicAttacks({
      attackers,
      allies: attackers,
      target: jug,
      enemies: team,
      hits: 1,
    });

    assert.ok(out2.totalDealt > 0);
    assert.ok(attackers[0]!.hp < attackerHp, 'THORNS phải phản damage về attacker');
    assert.equal(buffPct(jug, 'ATK_UP'), 0.05, 'Juggernaut passive +5% ATK khi bị đánh');
  });

  it('Executioner / Sever: có true damage xuyên shield', () => {
    const team = createTeam(['Executioner', 'Tank', 'Healer'], 'P1');
    const ex = team[0]!;
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const target = enemies[0]!;
    target.shield = 200;
    const hpBefore = target.hp;

    const out = useSkill({ caster: ex, allies: team, enemies, mana: 40, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.ok(out.damage >= Math.round(target.maxHp * 0.12));
    assert.ok(target.hp < hpBefore);
  });

  it('Sniper / Deadshot: xuyên shield, không phá shield', () => {
    const team = createTeam(['Sniper', 'Tank', 'Healer'], 'P1');
    const sniper = team[0]!;
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const target = enemies[0]!;
    target.shield = 500;
    const shieldBefore = target.shield;
    const hpBefore = target.hp;

    const out = useSkill({ caster: sniper, allies: team, enemies, mana: 36, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.equal(target.shield, shieldBefore, 'Deadshot phải bỏ qua shield');
    assert.ok(target.hp < hpBefore);
  });

  it('Taunt redirect single-target skill về Tank', () => {
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const tank = enemies[0]!;
    tank.buffs.push({ kind: 'TAUNT', pct: 0, turns: 1 });
    const allies = createTeam(['Burst', 'Tank', 'Healer'], 'P1');
    const caster = allies[0]!;
    const healer = enemies[2]!;

    const out = useSkill({
      caster,
      allies,
      enemies,
      mana: 40,
      targetUid: healer.uid,
    });

    assert.equal(out.ok, true);
    assert.equal(out.targetUid, tank.uid, 'skill single-target phải bị Taunt kéo về Tank');
    assert.ok(tank.hp < tank.maxHp);
  });

  it('Assassin auto-lowest-HP miễn nhiễm Taunt', () => {
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const tank = enemies[0]!;
    tank.buffs.push({ kind: 'TAUNT', pct: 0, turns: 1 });
    enemies[1]!.hp = 100; // Burst thấp nhất
    const allies = createTeam(['Assassin', 'Tank', 'Healer'], 'P1');
    const assassin = allies[0]!;

    const out = useSkill({ caster: assassin, allies, enemies, mana: 40 });

    assert.equal(out.ok, true);
    assert.equal(out.targetUid, enemies[1]!.uid, 'Assassin vẫn chọn lowest HP');
  });
});

describe('P2 heroes', () => {
  it('Cleaver / Amputation: AoE cả 3 địch', () => {
    const team = createTeam(['Cleaver', 'Tank', 'Healer'], 'P1');
    const cleaver = team[0]!;
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const before = enemies.map((h) => h.hp);

    const out = useSkill({ caster: cleaver, allies: team, enemies, mana: 48 });

    assert.equal(out.ok, true);
    assert.ok(out.damage > 0);
    enemies.forEach((enemy, i) => assert.ok(enemy.hp < before[i]!, `${enemy.uid} phải mất HP`));
  });

  it('Pyromancer / Ignite: damage + Burn 4% 2 lượt', () => {
    const team = createTeam(['Pyromancer', 'Tank', 'Healer'], 'P1');
    const pyro = team[0]!;
    const enemies = p2();
    const target = enemies[0]!;

    const out = useSkill({ caster: pyro, allies: team, enemies, mana: 36, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.ok(out.damage > 0);
    const burn = target.buffs.find((b) => b.kind === 'BURN');
    assert.ok(burn);
    assert.equal(burn!.pct, 0.04);
    assert.equal(burn!.turns, 2);
  });

  it('Venomancer / Toxic Miasma: Poison cả 3 địch', () => {
    const team = createTeam(['Venomancer', 'Tank', 'Healer'], 'P1');
    const venom = team[0]!;
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');

    const out = useSkill({ caster: venom, allies: team, enemies, mana: 40 });

    assert.equal(out.ok, true);
    for (const enemy of enemies) {
      const poison = enemy.buffs.find((b) => b.kind === 'POISON');
      assert.ok(poison, `${enemy.uid} phải bị Poison`);
      assert.equal(poison!.pct, 0.03);
    }
  });

  it('Oracle / Mend: hồi ally thấp nhất + cleanse 1 debuff', () => {
    const team = createTeam(['Oracle', 'Tank', 'Healer'], 'P1');
    const oracle = team[0]!;
    const tank = team[1]!;
    tank.hp = 200;
    tank.buffs.push({ kind: 'ATK_DOWN', pct: 0.5, turns: 2 });

    const out = useSkill({
      caster: oracle,
      allies: team,
      enemies: p2(),
      mana: 36,
      targetUid: tank.uid,
    });

    assert.equal(out.ok, true);
    assert.ok(out.healed > 0);
    assert.equal(tank.buffs.some((b) => b.kind === 'ATK_DOWN'), false);
    assert.ok(tank.hp > 200);
  });

  it('Healer overheal → shield, cap 20% maxHP', () => {
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const healer = team[2]!;

    const out = useSkill({ caster: healer, allies: team, enemies: p2(), mana: 48 });

    assert.equal(out.ok, true);
    assert.equal(out.healed, 0);
    assert.ok(out.shielded > 0);
    assert.ok(team[0]!.shield > 0);
    assert.ok(team[1]!.shield > 0);
    assert.ok(team[2]!.shield > 0);
  });
});

describe('P3 heroes', () => {
  it('Necromancer / Raise Thrall: tạo summon 280/54', () => {
    const team = createTeam(['Necromancer', 'Tank', 'Healer'], 'P1');
    const necro = team[0]!;

    const out = useSkill({ caster: necro, allies: team, enemies: p2(), mana: 48 });

    assert.equal(out.ok, true);
    assert.ok(out.summon);
    assert.equal(out.summon!.hp, 280);
    assert.equal(out.summon!.atk, 54);
    assert.equal(out.summon!.ownerUid, necro.uid);
  });

  it('Chronarch / Time Warp: +1 CD địch, -1 CD ally', () => {
    const team = createTeam(['Chronarch', 'Tank', 'Healer'], 'P1');
    const chrono = team[0]!;
    team[1]!.cd = 3;
    const enemies = p2();
    enemies[1]!.cd = 1;

    const out = useSkill({ caster: chrono, allies: team, enemies, mana: 40 });

    assert.equal(out.ok, true);
    assert.equal(enemies[1]!.cd, 2);
    assert.equal(team[1]!.cd, 2);
  });

  it('Spellbreaker / Mana Drain: đốt mana, hồi mana, strip buff', () => {
    const team = createTeam(['Spellbreaker', 'Tank', 'Healer'], 'P1');
    const breaker = team[0]!;
    const enemies = p2();
    const target = enemies[0]!;
    target.buffs.push({ kind: 'ATK_UP', pct: 0.3, turns: 2 });

    const out = useSkill({
      caster: breaker,
      allies: team,
      enemies,
      mana: 36,
      targetUid: target.uid,
      enemyMana: 50,
    });

    assert.equal(out.ok, true);
    assert.equal(out.enemyMana, 25);
    assert.equal(out.mana, 15); // 36 - 36 + 15
    assert.equal(target.buffs.some((b) => b.kind === 'ATK_UP'), false);
  });

  it('Berserker / Reckless Swing: mất HP, +25% ATK', () => {
    const team = createTeam(['Berserker', 'Tank', 'Healer'], 'P1');
    const zerker = team[0]!;
    const enemies = p2();
    const target = enemies[0]!;
    const beforeHp = zerker.hp;

    const out = useSkill({ caster: zerker, allies: team, enemies, mana: 32, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.ok(out.damage > 0);
    assert.ok(zerker.hp < beforeHp);
    assert.ok(zerker.buffs.some((b) => b.kind === 'ATK_UP' && b.pct === 0.25));
  });

  it('Chronarch passive: skill đầu tiên của ally −10 mana', () => {
    const team = createTeam(['Chronarch', 'Burst', 'Healer'], 'P1');
    const burst = team[1]!;

    const out = useSkill({
      caster: burst,
      allies: team,
      enemies: p2(),
      mana: 30, // Burst cost 40 - 10
    });

    assert.equal(out.ok, true);
    assert.equal(out.mana, 0);
    assert.equal(burst.firstSkillUsed, true);
  });

  it('Spellbreaker passive: skill địch +5 mana', () => {
    const team = createTeam(['Burst', 'Tank', 'Healer'], 'P1');
    const burst = team[0]!;
    const enemies = createTeam(['Spellbreaker', 'Tank', 'Healer'], 'P2');

    const fail = useSkill({ caster: burst, allies: team, enemies, mana: 40 });
    assert.equal(fail.reason, 'NO_MANA');

    const ok = useSkill({ caster: burst, allies: team, enemies, mana: 45 });
    assert.equal(ok.ok, true);
  });
});
