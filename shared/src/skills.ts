/** 8 skill độc — README mục 4.7, 4.8. Mỗi hàm mutate HeroState được truyền vào. */
import { CONFIG } from './config.js';
import type { HeroState, ThrallState } from './types.js';
import {
  addShield,
  ceilSafe,
  cleanseOne,
  damageMultiplier,
  dealDamage,
  dealTrueDamage,
  effectiveAtk,
  forcedTarget,
  healHero,
  stripOneBuff,
} from './combat.js';
import { heroDef } from './heroes.js';

export type SkillReject =
  | 'DEAD'
  | 'NO_TARGET'
  | 'NO_MANA'
  | 'ON_COOLDOWN'
  | 'ALREADY_USED'
  | 'USED_ONCE';

export interface UseSkillArgs {
  caster: HeroState;
  /** Toàn đội của caster (kể cả đã chết) — passive team vẫn tính theo tướng còn sống. */
  allies: HeroState[];
  /** Toàn đội địch. */
  enemies: HeroState[];
  mana: number;
  targetUid?: string | null;
  /** Server đã dùng skill nào trong lượt này chưa (tối đa 1/lượt). */
  alreadyUsedThisTurn?: boolean;
  /** Mana của đội địch — cho Mana Drain. */
  enemyMana?: number;
  /** Thrall của đội địch — để AoE clear. */
  enemyThrall?: ThrallState | null;
}

export interface SkillOutcome {
  ok: boolean;
  reason?: SkillReject;
  mana: number;
  cd: number;
  damage: number;
  absorbed: number;
  healed: number;
  shielded: number;
  logs: string[];
  targetUid: string | null;
  enemyMana?: number;
  summon?: ThrallState | null;
}

function chooseEnemy(enemies: readonly HeroState[], uid: string | null): HeroState | null {
  if (uid) {
    const chosen = enemies.find((h) => h.alive && h.uid === uid);
    if (chosen) return chosen;
  }
  return enemies.find((h) => h.alive) ?? null;
}

function lowestHpEnemy(enemies: readonly HeroState[]): HeroState | null {
  let best: HeroState | null = null;
  for (const hero of enemies) {
    if (!hero.alive) continue;
    if (!best || hero.hp / hero.maxHp < best.hp / best.maxHp) best = hero;
  }
  return best;
}

function lowestHpAlly(allies: readonly HeroState[]): HeroState | null {
  return lowestHpEnemy(allies);
}

/** Cost thực tế: base − Chronarch discount + Spellbreaker tax. */
export function effectiveSkillCost(
  caster: HeroState,
  allies: readonly HeroState[],
  enemies: readonly HeroState[],
): number {
  const def = heroDef(caster.archetype);
  const hasChronarch = allies.some((a) => a.alive && a.archetype === 'Chronarch');
  const chronoDiscount = hasChronarch && !caster.firstSkillUsed ? 10 : 0;
  const spellTax = enemies.some((a) => a.alive && a.archetype === 'Spellbreaker') ? 5 : 0;
  return Math.max(0, def.skill.mana - chronoDiscount + spellTax);
}

export function canUseSkill(
  caster: HeroState,
  mana: number,
  alreadyUsedThisTurn = false,
  costOverride?: number,
): SkillReject | null {
  const def = heroDef(caster.archetype);
  if (alreadyUsedThisTurn) return 'ALREADY_USED';
  if (!caster.alive) return 'DEAD';
  if (def.skill.once && caster.onceUsed.includes(def.skill.id)) return 'USED_ONCE';
  if (caster.cd > 0) return 'ON_COOLDOWN';
  if (mana < (costOverride ?? def.skill.mana)) return 'NO_MANA';
  return null;
}

export function useSkill(args: UseSkillArgs): SkillOutcome {
  const { caster, allies, enemies } = args;
  const def = heroDef(caster.archetype);
  const base: SkillOutcome = {
    ok: false,
    mana: args.mana,
    cd: caster.cd,
    damage: 0,
    absorbed: 0,
    healed: 0,
    shielded: 0,
    logs: [],
    targetUid: null,
  };

  const cost = effectiveSkillCost(caster, allies, enemies);
  const reject = canUseSkill(caster, args.mana, args.alreadyUsedThisTurn ?? false, cost);
  if (reject) return { ...base, reason: reject };

  const targetKind = def.skill.target ?? 'enemy';
  let target: HeroState | null = null;
  if (targetKind === 'enemy') {
    // Taunt redirect single-target skill; Assassin auto-lowest-HP miễn nhiễm.
    const taunt = forcedTarget(enemies);
    target =
      caster.archetype === 'Assassin'
        ? lowestHpEnemy(enemies)
        : taunt ?? chooseEnemy(enemies, args.targetUid ?? null);
  } else if (targetKind === 'ally') {
    target =
      (args.targetUid ? allies.find((h) => h.alive && h.uid === args.targetUid) ?? null : null) ??
      lowestHpAlly(allies);
  } else if (targetKind === 'self') {
    target = caster.alive ? caster : null;
  }
  if (targetKind !== 'none' && !target) return { ...base, reason: 'NO_TARGET' };

  let mana = args.mana - cost;
  let damage = 0;
  let absorbed = 0;
  let healed = 0;
  let shielded = 0;
  let enemyMana: number | undefined;
  let summon: ThrallState | null | undefined;
  const logs: string[] = [`${caster.uid} dùng ${def.skill.name}`];

  switch (caster.archetype) {
    case 'Tank': {
      caster.buffs.push({ kind: 'TAUNT', pct: 0, turns: 1 });
      logs.push('Taunt: mọi đòn đánh của địch dồn về Tank trong 1 lượt');
      break;
    }

    case 'Burst': {
      const raw = 3 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      logs.push(
        `Nuke ${target!.uid}: ${damage} damage${absorbed > 0 ? ` (giáp chặn ${absorbed})` : ''}${target!.alive ? '' : ' ☠'}`,
      );
      break;
    }

    case 'Healer': {
      // Overheal chuyển thành shield, cap 20% maxHP/tướng.
      for (const ally of allies) {
        if (!ally.alive) continue;
        const amount = ceilSafe(ally.maxHp * 0.4);
        const actual = healHero(ally, amount);
        healed += actual;
        const overheal = Math.max(0, amount - actual);
        if (overheal > 0) {
          shielded += addShield(ally, Math.min(overheal, ceilSafe(ally.maxHp * 0.2)));
        }
      }
      logs.push(`Mass Heal: hồi ${healed} HP, overheal → ${shielded} shield`);
      break;
    }

    case 'Controller': {
      target!.buffs.push({ kind: 'ATK_DOWN', pct: 0.5, turns: 2 });
      target!.buffs.push({ kind: 'DOT_DOWN', pct: 0.25, turns: 2 });
      mana += 10; // passive Siphon
      logs.push(`Weaken ${target!.uid}: -50% ATK và -25% DoT trong 2 lượt (+10 mana)`);
      break;
    }

    case 'Buffer': {
      for (const hero of allies) {
        if (!hero.alive) continue;
        hero.buffs.push({ kind: 'ATK_UP', pct: 0.3, turns: 2 });
        addShield(hero, ceilSafe(hero.maxHp * 0.2));
      }
      logs.push('Rally: +30% ATK và shield 20% maxHP cho toàn đội');
      break;
    }

    case 'Debuffer': {
      target!.buffs.push({ kind: 'DEF_DOWN', pct: 0.5, turns: 2 });
      logs.push(`Strip ${target!.uid}: -50% DEF trong 2 lượt`);
      break;
    }

    case 'Assassin': {
      const raw = 2.5 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { ignoreDefPct: 0.5, allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      logs.push(
        `Execute ${target!.uid}: ${damage} damage (bỏ qua 50% DEF)${absorbed > 0 ? ` · giáp chặn ${absorbed}` : ''}${target!.alive ? '' : ' ☠'}`,
      );
      break;
    }

    case 'Bruiser': {
      const raw = 2 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      healed = healHero(caster, Math.round(damage * 0.5));
      logs.push(
        `Lifesteal Strike ${target!.uid}: ${damage} damage${absorbed > 0 ? ` (giáp chặn ${absorbed})` : ''}, hồi ${healed} HP`,
      );
      break;
    }

    case 'Paladin': {
      target!.buffs.push({ kind: 'INVINCIBLE', pct: 0, turns: 1 });
      logs.push(`Divine Aegis ${target!.uid}: Invincible 1 lượt`);
      break;
    }

    case 'Juggernaut': {
      caster.buffs.push({ kind: 'THORNS', pct: 0.4, turns: 2 });
      caster.buffs.push({ kind: 'DEF_UP', pct: 0.2, turns: 2 });
      logs.push('Iron Thorns: phản 40% damage basic và +20% DEF trong 2 lượt');
      break;
    }

    case 'Executioner': {
      const raw = 1.8 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { ignoreDefPct: 0.4, allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      const trueDamage = dealTrueDamage(target!, target!.maxHp * 0.12);
      damage += trueDamage;
      logs.push(
        `Sever ${target!.uid}: ${damage} damage (gồm ${trueDamage} true)${absorbed > 0 ? ` · giáp chặn ${absorbed}` : ''}${target!.alive ? '' : ' ☠'}`,
      );
      break;
    }

    case 'Sniper': {
      const shieldBonus = target!.shield > 0 ? 1.3 : 1;
      const raw = 2.4 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!) * shieldBonus;
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { ignoreShield: true, allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      logs.push(
        `Deadshot ${target!.uid}: ${damage} damage (xuyên shield)${shieldBonus > 1 ? ' · +30% vì target có shield' : ''}${target!.alive ? '' : ' ☠'}`,
      );
      break;
    }

    case 'Cleaver': {
      const alive = enemies.filter((h) => h.alive);
      const sweep = alive.length === 3 ? 1.15 : 1;
      const multiplier = (1.3 + alive.length * 0.1) * sweep;
      for (const enemy of alive) {
        const raw = multiplier * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, enemy);
        const shieldBefore = enemy.shield;
        const dealt = dealDamage(enemy, raw, { allies: enemies });
        damage += dealt;
        absorbed += Math.max(0, shieldBefore - enemy.shield);
      }
      if (args.enemyThrall?.alive) {
        const thrallDamage = Math.round(multiplier * effectiveAtk(caster, allies));
        args.enemyThrall.hp = Math.max(0, args.enemyThrall.hp - thrallDamage);
        if (args.enemyThrall.hp === 0) args.enemyThrall.alive = false;
        logs.push(`Amputation clear Thrall: -${thrallDamage} HP`);
      }
      logs.push(`Amputation: ${damage} damage lên ${alive.length} địch (${multiplier.toFixed(2)}× ATK)`);
      break;
    }

    case 'Pyromancer': {
      const raw = 1.2 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      target!.buffs.push({ kind: 'BURN', pct: 0.04, turns: 2 });
      logs.push(
        `Ignite ${target!.uid}: ${damage} damage + Burn 4% maxHP/lượt 2 lượt${absorbed > 0 ? ` (giáp chặn ${absorbed})` : ''}`,
      );
      break;
    }

    case 'Venomancer': {
      let poisoned = 0;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.buffs.push({ kind: 'POISON', pct: 0.03, turns: 2 });
        poisoned += 1;
      }
      logs.push(`Toxic Miasma: Poison 3% maxHP/lượt 2 lượt lên ${poisoned} địch`);
      break;
    }

    case 'Oracle': {
      const amount = ceilSafe(target!.maxHp * 0.35);
      healed = healHero(target!, amount);
      const removed = cleanseOne(target!);
      logs.push(
        `Mend ${target!.uid}: hồi ${healed} HP${removed ? ` · cleanse ${removed.kind}` : ''}`,
      );
      break;
    }

    case 'Necromancer': {
      summon = {
        hp: 280,
        maxHp: 280,
        atk: 54,
        ownerUid: caster.uid,
        alive: true,
      };
      logs.push('Raise Thrall: 280 HP / 54 ATK — đánh target đã commit sau lượt');
      break;
    }

    case 'Chronarch': {
      let bumped = 0;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const cap = heroDef(enemy.archetype).skill.cd + 2;
        enemy.cd = Math.min(cap, enemy.cd + 1);
        bumped += 1;
      }
      const ally = [...allies]
        .filter((a) => a.alive && a.cd > 0)
        .sort((a, b) => b.cd - a.cd)[0];
      if (ally) ally.cd -= 1;
      logs.push(
        `Time Warp: +1 CD cho ${bumped} địch${ally ? ` · ${ally.uid} -1 CD` : ''}`,
      );
      break;
    }

    case 'Spellbreaker': {
      enemyMana = Math.max(0, (args.enemyMana ?? 0) - 25);
      mana = Math.min(CONFIG.MANA_MAX, mana + 15);
      const removed = stripOneBuff(target!);
      logs.push(
        `Mana Drain: đốt 25 mana địch, +15 mana${removed ? ` · strip ${removed.kind}` : ''}`,
      );
      break;
    }

    case 'Berserker': {
      const raw = 2.2 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw, { allies: enemies });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      const selfLoss = Math.min(Math.max(0, caster.hp - 1), Math.round(caster.hp * 0.1));
      caster.hp -= selfLoss;
      caster.buffs.push({ kind: 'ATK_UP', pct: 0.25, turns: 2 });
      logs.push(
        `Reckless Swing ${target!.uid}: ${damage} damage · tự mất ${selfLoss} HP · +25% ATK 2 lượt`,
      );
      break;
    }

    default:
      throw new Error(`Skill chưa implement cho ${caster.archetype}`);
  }

  caster.cd = def.skill.cd;
  caster.firstSkillUsed = true;
  if (def.skill.once) caster.onceUsed.push(def.skill.id);

  return {
    ok: true,
    mana: Math.min(CONFIG.MANA_MAX, Math.max(0, mana)),
    cd: caster.cd,
    damage,
    absorbed,
    healed,
    shielded,
    logs,
    targetUid: target?.uid ?? null,
    ...(enemyMana !== undefined ? { enemyMana } : {}),
    ...(summon !== undefined ? { summon } : {}),
  };
}
