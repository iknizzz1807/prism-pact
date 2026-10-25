/**
 * Text tiếng Anh cho Jev (model decision hoạt động tốt nhất với state tiếng Anh).
 * Giữ riêng khỏi shared để không đổi dữ liệu hiển thị của client.
 */
import type { Archetype } from '@prism-pact/shared';

export const SKILL_TEXT_EN: Record<string, string> = {
  TAUNT: 'Force all enemy attacks to target the caster for 1 turn.',
  NUKE: 'Deal 3x ATK damage to one enemy.',
  MASS_HEAL:
    'Heal all allies for 40% of their max HP. Overheal becomes shield (up to 20% max HP per ally).',
  WEAKEN: 'Reduce the target enemy ATK by 50% for 2 turns; gain 10 mana.',
  RALLY: '+30% ATK and a shield of 20% max HP for all allies for 2 turns.',
  STRIP: 'Reduce the target enemy DEF by 50% for 2 turns.',
  EXECUTE: 'Deal 2.5x ATK to the lowest-HP enemy, ignoring 50% DEF.',
  LIFESTEAL_STRIKE: 'Deal 2x ATK damage and heal the caster for 50% of damage dealt.',
  DIVINE_AEGIS: 'Give one ally Invincible for 1 turn. Once per match.',
  IRON_THORNS: 'For 2 turns: reflect 40% of basic damage and gain +20% DEF.',
  SEVER:
    'Deal 1.8x ATK plus 12% of target max HP as true damage, ignoring 40% DEF.',
  DEADSHOT: 'Deal 2.4x ATK, piercing shield; +30% damage if the target has shield.',
  AMPUTATION:
    'Deal 1.3x ATK to all enemies; +10% per living enemy. Also damages enemy Thrall.',
  IGNITE: 'Deal 1.2x ATK and apply Burn (4% max HP per turn for 2 turns).',
  TOXIC_MIASMA:
    'Poison all enemies (3% max HP per turn for 2 turns, pierces shield).',
  MEND: 'Heal the lowest-HP ally for 35% max HP and cleanse 1 debuff.',
  RAISE_THRALL:
    'Summon a 280 HP / 54 ATK Thrall that attacks your target; it dies with its owner.',
  TIME_WARP: '+1 cooldown to all enemy skills (cap +2) and -1 cooldown to one ally.',
  MANA_DRAIN: 'Burn 25 enemy mana, gain 15 mana, and strip 1 buff from the target.',
  RECKLESS_SWING:
    'Deal 2.2x ATK, lose 10% of current HP (cannot kill self), gain +25% ATK for 2 turns.',
};

export const ARCHETYPE_ROLE: Record<Archetype, string> = {
  Tank: 'tank / taunt',
  Burst: 'burst damage',
  Healer: 'team heal',
  Controller: 'ATK debuff',
  Buffer: 'team buff / shield',
  Debuffer: 'DEF shred',
  Assassin: 'execute low HP',
  Bruiser: 'damage / lifesteal',
  Paladin: 'protect / invincible',
  Juggernaut: 'tank / thorns',
  Executioner: 'single-target damage',
  Sniper: 'anti-shield damage',
  Cleaver: 'AoE damage',
  Pyromancer: 'burn DoT',
  Venomancer: 'poison AoE',
  Oracle: 'heal / cleanse',
  Necromancer: 'summon',
  Chronarch: 'cooldown control',
  Spellbreaker: 'mana drain',
  Berserker: 'risky damage',
};

/**
 * Option key có ngữ nghĩa (HEAL_3, ATTACK_2...) thay vì A/B/C.
 * Jev chọn chính xác hơn khi key gợi ý loại hành động; suffix giữ key duy nhất.
 */
const SKILL_KEY_BASE: Record<string, string> = {
  TAUNT: 'TAUNT',
  NUKE: 'ATTACK',
  MASS_HEAL: 'HEAL',
  WEAKEN: 'DEBUFF',
  RALLY: 'BUFF',
  STRIP: 'DEBUFF',
  EXECUTE: 'ATTACK',
  LIFESTEAL_STRIKE: 'ATTACK',
  DIVINE_AEGIS: 'PROTECT',
  IRON_THORNS: 'GUARD',
  SEVER: 'ATTACK',
  DEADSHOT: 'ATTACK',
  AMPUTATION: 'ATTACK',
  IGNITE: 'DOT',
  TOXIC_MIASMA: 'DOT',
  MEND: 'HEAL',
  RAISE_THRALL: 'SUMMON',
  TIME_WARP: 'TEMPO',
  MANA_DRAIN: 'DRAIN',
  RECKLESS_SWING: 'ATTACK',
};

export function skillOptionKey(skillId: string, index: number): string {
  return `${SKILL_KEY_BASE[skillId] ?? 'SKILL'}_${index + 1}`;
}

export function skillTextEn(skillId: string, fallback: string): string {
  return SKILL_TEXT_EN[skillId] ?? fallback;
}
