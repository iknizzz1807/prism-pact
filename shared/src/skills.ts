/** 8 skill độc — README mục 4.7, 4.8. Mỗi hàm mutate HeroState được truyền vào. */
import { CONFIG } from './config.js';
import type { HeroState } from './types.js';
import {
  addShield,
  ceilSafe,
  damageMultiplier,
  dealDamage,
  effectiveAtk,
  healHero,
  healTeam,
} from './combat.js';
import { heroDef } from './heroes.js';

export type SkillReject = 'DEAD' | 'NO_TARGET' | 'NO_MANA' | 'ON_COOLDOWN' | 'ALREADY_USED';

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
}

export interface SkillOutcome {
  ok: boolean;
  reason?: SkillReject;
  mana: number;
  cd: number;
  damage: number;
  absorbed: number;
  healed: number;
  logs: string[];
  targetUid: string | null;
}

const SKILLS_WITHOUT_ENEMY_TARGET: ReadonlySet<string> = new Set(['Tank', 'Healer', 'Buffer']);

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

export function canUseSkill(
  caster: HeroState,
  mana: number,
  alreadyUsedThisTurn = false,
): SkillReject | null {
  const def = heroDef(caster.archetype);
  if (alreadyUsedThisTurn) return 'ALREADY_USED';
  if (!caster.alive) return 'DEAD';
  if (caster.cd > 0) return 'ON_COOLDOWN';
  if (mana < def.skill.mana) return 'NO_MANA';
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
    logs: [],
    targetUid: null,
  };

  const reject = canUseSkill(caster, args.mana, args.alreadyUsedThisTurn ?? false);
  if (reject) return { ...base, reason: reject };

  const needsTarget = !SKILLS_WITHOUT_ENEMY_TARGET.has(caster.archetype);
  const target =
    caster.archetype === 'Assassin'
      ? lowestHpEnemy(enemies)
      : chooseEnemy(enemies, args.targetUid ?? null);
  if (needsTarget && !target) return { ...base, reason: 'NO_TARGET' };

  let mana = args.mana - def.skill.mana;
  let damage = 0;
  let absorbed = 0;
  let healed = 0;
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
      damage = dealDamage(target!, raw);
      absorbed = Math.max(0, shieldBefore - target!.shield);
      logs.push(
        `Nuke ${target!.uid}: ${damage} damage${absorbed > 0 ? ` (giáp chặn ${absorbed})` : ''}${target!.alive ? '' : ' ☠'}`,
      );
      break;
    }

    case 'Healer': {
      healed = healTeam(allies, 0.4);
      logs.push(`Mass Heal: hồi ${healed} HP toàn đội`);
      break;
    }

    case 'Controller': {
      target!.buffs.push({ kind: 'ATK_DOWN', pct: 0.5, turns: 2 });
      mana += 10; // passive Siphon
      logs.push(`Weaken ${target!.uid}: -50% ATK trong 2 lượt (+10 mana)`);
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
      damage = dealDamage(target!, raw, { ignoreDefPct: 0.5 });
      absorbed = Math.max(0, shieldBefore - target!.shield);
      logs.push(
        `Execute ${target!.uid}: ${damage} damage (bỏ qua 50% DEF)${absorbed > 0 ? ` · giáp chặn ${absorbed}` : ''}${target!.alive ? '' : ' ☠'}`,
      );
      break;
    }

    case 'Bruiser': {
      const raw = 2 * effectiveAtk(caster, allies) * damageMultiplier(caster, allies, target!);
      const shieldBefore = target!.shield;
      damage = dealDamage(target!, raw);
      absorbed = Math.max(0, shieldBefore - target!.shield);
      healed = healHero(caster, Math.round(damage * 0.5));
      logs.push(
        `Lifesteal Strike ${target!.uid}: ${damage} damage${absorbed > 0 ? ` (giáp chặn ${absorbed})` : ''}, hồi ${healed} HP`,
      );
      break;
    }
  }

  caster.cd = def.skill.cd;

  return {
    ok: true,
    mana: Math.min(CONFIG.MANA_MAX, Math.max(0, mana)),
    cd: caster.cd,
    damage,
    absorbed,
    healed,
    logs,
    targetUid: target?.uid ?? null,
  };
}
