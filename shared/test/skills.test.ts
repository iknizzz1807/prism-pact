import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canUseSkill, useSkill } from '../src/skills.js';
import { effectiveAtk, effectiveDef, forcedTarget, mitigated } from '../src/combat.js';
import { createTeam } from '../src/heroes.js';

const p1 = () => createTeam(['Tank', 'Burst', 'Healer'], 'P1');
const p2 = () => createTeam(['Tank', 'Burst', 'Healer'], 'P2');

function near(actual: number, expected: number, eps = 1e-9): void {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !≈ ${expected}`);
}

describe('skill validation', () => {
  it('thiếu mana → NO_MANA', () => {
    const allies = p1();
    const out = useSkill({ caster: allies[1]!, allies, enemies: p2(), mana: 49 });
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

    const out = useSkill({ caster, allies, enemies, mana: 50, targetUid: target.uid });

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
    allies[0]!.hp = 1000;
    allies[1]!.hp = 500;

    const out = useSkill({ caster: healer, allies, enemies: p2(), mana: 60 });

    assert.equal(out.ok, true);
    assert.equal(out.healed, 720 + 360);
    assert.equal(allies[0]!.hp, 1720);
    assert.equal(allies[1]!.hp, 860);
    assert.equal(allies[2]!.hp, 1100);
    assert.equal(out.mana, 0);
  });

  it('Controller / Weaken: -50% ATK 2 lượt, passive +10 mana', () => {
    const controllerTeam = createTeam(['Tank', 'Controller', 'Healer'], 'P1');
    const controller = controllerTeam[1]!;
    const enemies = p2();
    const target = enemies[0]!;

    const before = effectiveAtk(target, enemies);
    const out = useSkill({
      caster: controller,
      allies: controllerTeam,
      enemies,
      mana: 40,
      targetUid: target.uid,
    });

    assert.equal(out.ok, true);
    assert.equal(out.mana, 10); // 40 - 40 + 10
    near(effectiveAtk(target, enemies), before / 2);
    assert.equal(target.buffs.filter((b) => b.kind === 'ATK_DOWN').length, 1);
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
    assert.equal(team[0]!.shield, 360); // 20% của 1800
    assert.equal(team[1]!.shield, 200);
    assert.equal(team[2]!.shield, 220);
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
    bruiser.hp = 1000;
    const enemies = p2();
    const target = enemies[0]!;

    const out = useSkill({ caster: bruiser, allies: team, enemies, mana: 45, targetUid: target.uid });

    assert.equal(out.ok, true);
    assert.equal(out.damage, 100); // 160 raw vs DEF 60
    assert.equal(out.healed, 50);
    assert.equal(bruiser.hp, 1050);
  });

  it('Tank / Taunt: ép target của địch về mình', () => {
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const tank = team[0]!;

    const out = useSkill({ caster: tank, allies: team, enemies: p2(), mana: 40 });

    assert.equal(out.ok, true);
    assert.equal(forcedTarget(team)?.uid, tank.uid);
    assert.equal(out.mana, 0);
  });
});
