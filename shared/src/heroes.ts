/** Roster 8 archetype — README mục 4.8. Nguồn dữ liệu duy nhất cho cả client và server. */
import type { Archetype, HeroDef, HeroState, PassiveDef, Side, SkillDef } from './types.js';

const skill = (id: string, name: string, mana: number, cd: number, desc: string): SkillDef => ({
  id,
  name,
  mana,
  cd,
  desc,
});

const passive = (id: string, name: string, desc: string): PassiveDef => ({ id, name, desc });

export const ROSTER: readonly HeroDef[] = [
  {
    archetype: 'Tank',
    hp: 1800,
    atk: 50,
    def: 60,
    skill: skill('TAUNT', 'Taunt', 40, 3, 'Kéo toàn bộ target của địch về mình trong 1 lượt.'),
    passive: passive('TANK_RESOLVE', 'Resolve', '+30% DEF khi HP < 50%.'),
  },
  {
    archetype: 'Burst',
    hp: 900,
    atk: 120,
    def: 15,
    skill: skill('NUKE', 'Nuke', 50, 3, 'Gây 3× ATK lên 1 target.'),
    passive: passive('BURST_FOCUS', 'Focus', '+20% ATK khi cả 3 tướng còn sống.'),
  },
  {
    archetype: 'Healer',
    hp: 1100,
    atk: 40,
    def: 25,
    skill: skill('MASS_HEAL', 'Mass Heal', 60, 4, 'Hồi 40% maxHP cho cả đội.'),
    passive: passive('HEALER_DRIP', 'Drip', 'Tự hồi 5% maxHP đầu mỗi lượt.'),
  },
  {
    archetype: 'Controller',
    hp: 1000,
    atk: 60,
    def: 20,
    skill: skill('WEAKEN', 'Weaken', 40, 3, 'Giảm 50% ATK của target trong 2 lượt.'),
    passive: passive('CTRL_SIPHON', 'Siphon', 'Skill trúng → +10 mana cho đội.'),
  },
  {
    archetype: 'Buffer',
    hp: 1000,
    atk: 50,
    def: 30,
    skill: skill('RALLY', 'Rally', 50, 3, '+30% ATK và shield 20% maxHP cho cả đội trong 2 lượt.'),
    passive: passive('BUFFER_AURA', 'Aura', 'Cả đội +10% ATK.'),
  },
  {
    archetype: 'Debuffer',
    hp: 950,
    atk: 55,
    def: 20,
    skill: skill('STRIP', 'Strip', 40, 3, 'Giảm 50% DEF của target trong 2 lượt.'),
    passive: passive('DEBUFF_EXPLOIT', 'Exploit', 'Cả đội +15% damage lên target đang bị debuff.'),
  },
  {
    archetype: 'Assassin',
    hp: 850,
    atk: 100,
    def: 10,
    skill: skill('EXECUTE', 'Execute', 50, 3, '2.5× ATK, bỏ qua 50% DEF, đánh tướng HP thấp nhất.'),
    passive: passive('ASSASSIN_HUNT', 'Hunt', '+30% damage lên target dưới 30% HP.'),
  },
  {
    archetype: 'Bruiser',
    hp: 1400,
    atk: 80,
    def: 35,
    skill: skill('LIFESTEAL_STRIKE', 'Lifesteal Strike', 45, 3, '2× ATK và hồi 50% damage gây ra.'),
    passive: passive('BRUISER_LEECH', 'Leech', 'Cả đội +15% lifesteal khi đánh thường.'),
  },
] as const;

const BY_ARCHETYPE = new Map<Archetype, HeroDef>(ROSTER.map((h) => [h.archetype, h]));

export function heroDef(archetype: Archetype): HeroDef {
  const def = BY_ARCHETYPE.get(archetype);
  if (!def) throw new Error(`Unknown archetype: ${archetype}`);
  return def;
}

export function createHero(archetype: Archetype, side: Side, slot: number): HeroState {
  const def = heroDef(archetype);
  return {
    uid: `${side}:${slot}`,
    archetype,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    def: def.def,
    shield: 0,
    alive: true,
    cd: 0,
    buffs: [],
  };
}

/** Thứ tự trong mảng = thứ tự slot 1,2,3 (slot 1 là Tanker mặc định). */
export function createTeam(archetypes: [Archetype, Archetype, Archetype], side: Side): HeroState[] {
  return archetypes.map((a, i) => createHero(a, side, i));
}

export const livingHeroes = (team: readonly HeroState[]): HeroState[] => team.filter((h) => h.alive);

export const isTeamWiped = (team: readonly HeroState[]): boolean => team.every((h) => !h.alive);

export const totalHp = (team: readonly HeroState[]): number =>
  team.reduce((sum, h) => sum + h.hp, 0);

export const totalMaxHp = (team: readonly HeroState[]): number =>
  team.reduce((sum, h) => sum + h.maxHp, 0);
