import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addShield,
  applyGemEconomy,
  applySuddenDeath,
  buffPct,
  dealDamage,
  effectiveAtk,
  effectiveDef,
  endTurn,
  expireTaunts,
  forcedTarget,
  healTeam,
  mitigated,
  performBasicAttacks,
  resolveAttackTarget,
  startTurn,
} from '../src/combat.js';
import { createHero, createTeam, isTeamWiped } from '../src/heroes.js';
import type { HeroState } from '../src/types.js';

/** So sánh số thực có sai số (0.1 * 3 !== 0.3 trong JS). */
function near(actual: number, expected: number, eps = 1e-9): void {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !≈ ${expected}`);
}

describe('damage formula', () => {
  it('damage = raw * 100 / (100 + DEF)', () => {
    assert.equal(mitigated(120, 25), 96); // 12000/125
    assert.equal(mitigated(50, 60), 31); // 5000/160 = 31.25
    assert.equal(mitigated(120, 60), 75); // 12000/160
  });

  it('luôn gây ít nhất 1 damage', () => {
    assert.equal(mitigated(1, 100000), 1);
    assert.equal(mitigated(0, 0), 1);
  });

  it('shield hấp thụ trước khi trừ HP', () => {
    const tank = createHero('Tank', 'P2', 0);
    tank.shield = 50;
    const dealt = dealDamage(tank, 120); // mitigated = 75
    assert.equal(dealt, 25);
    assert.equal(tank.shield, 0);
    assert.equal(tank.hp, tank.maxHp - 25);
  });

  it('Ignore DEF 50% (Execute) làm tăng damage', () => {
    const target = createHero('Tank', 'P2', 0);
    const normal = mitigated(200, effectiveDef(target));
    const piercing = mitigated(200, effectiveDef(target) * 0.5);
    assert.ok(piercing > normal);
  });

  it('target chết → alive = false và shield về 0', () => {
    const target = createHero('Assassin', 'P2', 0);
    target.hp = 10;
    target.shield = 999;
    dealDamage(target, 100000);
    assert.equal(target.alive, false);
    assert.equal(target.hp, 0);
    assert.equal(target.shield, 0);
  });
});

describe('effective stats & passives', () => {
  it('Tank +30% DEF khi HP < 50%', () => {
    const tank = createHero('Tank', 'P1', 0);
    assert.equal(effectiveDef(tank), 60);
    tank.hp = tank.maxHp * 0.5;
    assert.equal(effectiveDef(tank), 60);
    tank.hp = tank.maxHp * 0.49;
    near(effectiveDef(tank), 78);
  });

  it('Burst +20% ATK khi đủ 3 người', () => {
    const allies = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const burst = allies[1]!;
    near(effectiveAtk(burst, allies), 144);
    allies[2]!.alive = false;
    near(effectiveAtk(burst, allies), 120);
  });

  it('Buffer còn sống → cả đội +10% ATK', () => {
    const allies = createTeam(['Tank', 'Buffer', 'Healer'], 'P1');
    near(effectiveAtk(allies[0]!, allies), 55);
  });

  it('ATK_UP cộng dồn', () => {
    const hero = createHero('Tank', 'P1', 0);
    hero.buffs.push({ kind: 'ATK_UP', pct: 0.3, turns: 2 });
    hero.buffs.push({ kind: 'ATK_UP', pct: 0.2, turns: 2 });
    near(buffPct(hero, 'ATK_UP'), 0.5);
    near(effectiveAtk(hero, [hero]), 75);
  });
});

describe('gem economy', () => {
  it('🩸 hồi 1% maxHP/tướng mỗi gem, 💧 nạp mana, 🛡️ tạo shield', () => {
    const team = [createHero('Tank', 'P1', 0)];
    const tank = team[0]!;
    tank.hp = 1000;

    const out = applyGemEconomy(team, { ATK: 0, HP: 3, MANA: 4, SHIELD: 2 }, 10);

    assert.equal(out.mana, 14);
    assert.equal(tank.hp, 1000 + 54); // ceil(1800 * 0.01 * 3)
    assert.equal(tank.shield, 36); // ceil(1800 * 0.01 * 2)
    assert.equal(out.healed, 54);
    assert.equal(out.shielded, 36);
  });

  it('shield cap 60% maxHP', () => {
    const tank = createHero('Tank', 'P1', 0);
    assert.equal(addShield(tank, 5000), 1080);
    assert.equal(addShield(tank, 5000), 0);
  });

  it('mana cap 100', () => {
    const out = applyGemEconomy([createHero('Tank', 'P1', 0)], { ATK: 0, HP: 0, MANA: 50, SHIELD: 0 }, 90);
    assert.equal(out.mana, 100);
  });
});

describe('basic attacks (round-robin + cap)', () => {
  it('5 hit → Tank, Burst, Healer, Tank, Burst', () => {
    const allies = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const enemies = createTeam(['Assassin', 'Tank', 'Burst'], 'P2');

    const out = performBasicAttacks({
      attackers: allies,
      allies,
      target: enemies[0]!,
      enemies,
      hits: 5,
    });

    assert.equal(out.scoredHits, 5);
    assert.equal(out.overflowMana, 0);
    assert.deepEqual(
      out.hits.map((h) => h.attackerUid),
      ['P1:0', 'P1:1', 'P1:2', 'P1:0', 'P1:1'],
    );
    // 45 + 131 + 36 + 45 + 131 = 388
    assert.equal(out.totalDealt, 388);
  });

  it('7 hit → chỉ 5 hit tính damage, 2 hit dư thành mana', () => {
    const allies = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const out = performBasicAttacks({ attackers: allies, allies, target: enemies[0]!, enemies, hits: 7 });
    assert.equal(out.scoredHits, 5);
    assert.equal(out.overflowMana, 2);
    assert.equal(out.hits.length, 5);
  });

  it('target chết giữa lượt → dồn sang tướng còn sống kế tiếp', () => {
    const allies = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const enemies = createTeam(['Assassin', 'Tank', 'Burst'], 'P2');
    enemies[0]!.hp = 1;

    const out = performBasicAttacks({ attackers: allies, allies, target: enemies[0]!, enemies, hits: 3 });

    assert.equal(out.hits[0]!.targetUid, 'P2:0');
    assert.equal(enemies[0]!.alive, false);
    assert.equal(out.hits[1]!.targetUid, 'P2:1');
  });

  it('Bruiser còn sống → cả đội lifesteal 15%', () => {
    const team = createTeam(['Bruiser', 'Tank', 'Healer'], 'P1');
    const bruiser = team[0]!;
    bruiser.hp = 1000;
    bruiser.atk = 100;

    const enemies = createTeam(['Assassin', 'Tank', 'Burst'], 'P2');
    const out = performBasicAttacks({ attackers: [bruiser], allies: team, target: enemies[0]!, enemies, hits: 1 });

    assert.equal(out.healed, 14); // round(91 * 0.15) — 91 là damage thực nhận
    assert.equal(bruiser.hp, 1014);
  });

  it('báo lượng damage bị giáp hấp thụ', () => {
    const allies = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const enemies = createTeam(['Assassin', 'Tank', 'Burst'], 'P2');
    const target = enemies[0]!;
    target.shield = 1000;

    const out = performBasicAttacks({ attackers: allies, allies, target, enemies, hits: 3 });

    assert.ok(out.absorbedTotal > 0);
    assert.equal(out.totalDealt, 0, 'giáp đủ dày thì HP không đổi');
    assert.equal(
      out.hits.reduce((sum, hit) => sum + hit.absorbed, 0),
      out.absorbedTotal,
    );
    assert.equal(out.hits.every((hit) => hit.dealt === 0), true);
  });

  it('đội đã chết hết → không gây damage', () => {
    const dead = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    for (const h of dead) h.alive = false;
    const enemies = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const out = performBasicAttacks({ attackers: dead, allies: dead, target: enemies[0]!, enemies, hits: 5 });
    assert.equal(out.scoredHits, 0);
    assert.equal(out.hits.length, 0);
    assert.equal(out.totalDealt, 0);
  });
});

describe('target & taunt', () => {
  it('mặc định dồn vào slot 1 còn sống', () => {
    const defenders = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    assert.equal(resolveAttackTarget(defenders, null)?.uid, 'P2:0');
    defenders[0]!.alive = false;
    assert.equal(resolveAttackTarget(defenders, null)?.uid, 'P2:1');
  });

  it('target đã chọn được ưu tiên', () => {
    const defenders = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    assert.equal(resolveAttackTarget(defenders, 'P2:2')?.uid, 'P2:2');
  });

  it('Taunt ép target về Tank trong 1 lượt', () => {
    const defenders = createTeam(['Tank', 'Burst', 'Healer'], 'P2');
    const tank = defenders[0]!;
    tank.buffs.push({ kind: 'TAUNT', pct: 0, turns: 1 });

    assert.equal(forcedTarget(defenders)?.uid, tank.uid);
    assert.equal(resolveAttackTarget(defenders, 'P2:2')?.uid, tank.uid);

    expireTaunts(defenders);
    assert.equal(forcedTarget(defenders), null);
    assert.equal(resolveAttackTarget(defenders, 'P2:2')?.uid, 'P2:2');
  });
});

describe('turn lifecycle', () => {
  it('Healer tự hồi 5% maxHP đầu lượt', () => {
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    const healer = team[2]!;
    healer.hp = 1000;
    const logs = startTurn(team);
    assert.equal(healer.hp, 1055); // ceil(1100 * 0.05)
    assert.equal(logs.length, 1);
  });

  it('endTurn giảm CD và tick buff, TAUNT không bị tick', () => {
    const tank = createHero('Tank', 'P1', 0);
    tank.cd = 3;
    tank.buffs.push({ kind: 'ATK_UP', pct: 0.3, turns: 2 });
    tank.buffs.push({ kind: 'TAUNT', pct: 0, turns: 1 });

    endTurn([tank]);
    assert.equal(tank.cd, 2);
    assert.equal(buffPct(tank, 'ATK_UP'), 0.3);
    assert.equal(tank.buffs.find((b) => b.kind === 'ATK_UP')!.turns, 1);
    assert.ok(tank.buffs.some((b) => b.kind === 'TAUNT'));

    endTurn([tank]);
    assert.equal(buffPct(tank, 'ATK_UP'), 0);
  });

  it('Sudden Death trừ 5% maxHP, shield không hấp thụ', () => {
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    team[0]!.shield = 500;
    const lost = applySuddenDeath(team);
    assert.equal(lost, 90 + 45 + 55);
    assert.equal(team[0]!.hp, 1710);
    assert.equal(team[0]!.shield, 500);
  });

  it('healTeam không hồi quá maxHP và bỏ qua tướng chết', () => {
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    team[0]!.hp = 1700; // thiếu 100
    team[1]!.alive = false;
    team[1]!.hp = 0;
    team[2]!.hp = 1000; // thiếu 100

    const healed = healTeam(team, 0.5); // 50% maxHP, cap ở maxHP

    assert.equal(healed, 100 + 100);
    assert.equal(team[0]!.hp, 1800);
    assert.equal(team[2]!.hp, 1100);
    assert.equal(team[1]!.hp, 0);
  });

  it('isTeamWiped', () => {
    const team: HeroState[] = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    assert.equal(isTeamWiped(team), false);
    for (const h of team) h.alive = false;
    assert.equal(isTeamWiped(team), true);
  });
});
