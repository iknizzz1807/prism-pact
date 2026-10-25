/** Roster 8 archetype — README mục 4.8. Nguồn dữ liệu duy nhất cho cả client và server. */
import type { Archetype, HeroDef, HeroState, PassiveDef, Side, SkillDef } from './types.js';

const skill = (
  id: string,
  name: string,
  mana: number,
  cd: number,
  desc: string,
  target: SkillDef['target'] = 'enemy',
  once = false,
): SkillDef => ({
  id,
  name,
  mana,
  cd,
  desc,
  target,
  once,
});

const passive = (id: string, name: string, desc: string): PassiveDef => ({ id, name, desc });

export const ROSTER: readonly HeroDef[] = [
  {
    archetype: 'Tank',
    hp: 1440,
    atk: 60,
    def: 60,
    skill: skill('TAUNT', 'Taunt', 32, 3, 'Kéo toàn bộ target của địch về mình trong 1 lượt.', 'none'),
    passive: passive('TANK_RESOLVE', 'Resolve', '+30% DEF khi HP < 50%.'),
  },
  {
    archetype: 'Burst',
    hp: 720,
    atk: 144,
    def: 15,
    skill: skill('NUKE', 'Nuke', 40, 3, 'Gây 3× ATK lên 1 target.'),
    passive: passive('BURST_FOCUS', 'Focus', '+20% ATK khi cả 3 tướng còn sống.'),
  },
  {
    archetype: 'Healer',
    hp: 880,
    atk: 48,
    def: 25,
    skill: skill('MASS_HEAL', 'Mass Heal', 48, 4, 'Hồi 40% maxHP cho cả đội.', 'none'),
    passive: passive('HEALER_DRIP', 'Drip', 'Tự hồi 5% maxHP đầu mỗi lượt.'),
  },
  {
    archetype: 'Controller',
    hp: 800,
    atk: 72,
    def: 20,
    skill: skill('WEAKEN', 'Weaken', 32, 3, 'Giảm 50% ATK của target trong 2 lượt.'),
    passive: passive('CTRL_SIPHON', 'Siphon', 'Skill trúng → +10 mana cho đội.'),
  },
  {
    archetype: 'Buffer',
    hp: 800,
    atk: 60,
    def: 30,
    skill: skill('RALLY', 'Rally', 40, 3, '+30% ATK và shield 20% maxHP cho cả đội trong 2 lượt.', 'none'),
    passive: passive('BUFFER_AURA', 'Aura', 'Cả đội +10% ATK.'),
  },
  {
    archetype: 'Debuffer',
    hp: 760,
    atk: 66,
    def: 20,
    skill: skill('STRIP', 'Strip', 32, 3, 'Giảm 50% DEF của target trong 2 lượt.'),
    passive: passive('DEBUFF_EXPLOIT', 'Exploit', 'Cả đội +15% damage lên target đang bị debuff.'),
  },
  {
    archetype: 'Assassin',
    hp: 680,
    atk: 120,
    def: 10,
    skill: skill('EXECUTE', 'Execute', 40, 3, '2.5× ATK, bỏ qua 50% DEF, đánh tướng HP thấp nhất.'),
    passive: passive('ASSASSIN_HUNT', 'Hunt', '+30% damage lên target dưới 30% HP.'),
  },
  {
    archetype: 'Bruiser',
    hp: 1120,
    atk: 96,
    def: 35,
    skill: skill('LIFESTEAL_STRIKE', 'Lifesteal Strike', 36, 3, '2× ATK và hồi 50% damage gây ra.'),
    passive: passive('BRUISER_LEECH', 'Leech', 'Cả đội +15% lifesteal khi đánh thường.'),
  },
  // ── P1: 4 hero mới ────────────────────────────────────────────────────
  {
    archetype: 'Paladin',
    hp: 1400,
    atk: 66,
    def: 55,
    skill: skill(
      'DIVINE_AEGIS',
      'Divine Aegis',
      40,
      4,
      '1 đồng minh nhận Invincible 1 lượt. Chỉ dùng 1 lần/trận.',
      'ally',
      true,
    ),
    passive: passive('PALADIN_WARD', 'Ward', 'Đồng minh dưới 40% HP nhận +15% DEF.'),
  },
  {
    archetype: 'Juggernaut',
    hp: 1520,
    atk: 54,
    def: 65,
    skill: skill(
      'IRON_THORNS',
      'Iron Thorns',
      36,
      3,
      '2 lượt: phản 40% damage basic, +20% DEF.',
      'self',
    ),
    passive: passive('JUGGERNAUT_RAGE', 'Rage', 'Mỗi basic hit nhận vào +5% ATK (cap +20%).'),
  },
  {
    archetype: 'Executioner',
    hp: 800,
    atk: 114,
    def: 20,
    skill: skill(
      'SEVER',
      'Sever',
      40,
      4,
      '1.8× ATK + 12% maxHP true damage, bỏ qua 40% DEF.',
    ),
    passive: passive('EXECUTIONER_CUT', 'Measured Cut', '+25% damage lên target có DEF ≥40.'),
  },
  {
    archetype: 'Sniper',
    hp: 640,
    atk: 138,
    def: 12,
    skill: skill(
      'DEADSHOT',
      'Deadshot',
      36,
      3,
      '2.4× ATK, xuyên shield; +30% nếu target đang có shield.',
    ),
    passive: passive('SNIPER_FIRST', 'First Blood', '+15% ATK lên target còn full HP.'),
  },
  // ── P2: 4 hero AoE / DoT / cleanse ────────────────────────────────────
  {
    archetype: 'Cleaver',
    hp: 784,
    atk: 126,
    def: 15,
    skill: skill(
      'AMPUTATION',
      'Amputation',
      48,
      4,
      '1.3× ATK lên cả 3 địch; +10% mỗi địch còn sống.',
      'none',
    ),
    passive: passive('CLEAVER_SWEEP', 'Sweep', '+15% ATK khi còn 3 địch.'),
  },
  {
    archetype: 'Pyromancer',
    hp: 760,
    atk: 90,
    def: 20,
    skill: skill(
      'IGNITE',
      'Ignite',
      36,
      3,
      '1.2× ATK + Burn 4% maxHP/lượt trong 2 lượt.',
    ),
    passive: passive('PYRO_CINDER', 'Cinder', '+15% damage lên target đang Burn.'),
  },
  {
    archetype: 'Venomancer',
    hp: 840,
    atk: 72,
    def: 25,
    skill: skill(
      'TOXIC_MIASMA',
      'Toxic Miasma',
      40,
      4,
      'Poison 3% maxHP/lượt lên cả 3 địch trong 2 lượt; xuyên shield.',
      'none',
    ),
    passive: passive('VENOM_VIRULENCE', 'Virulence', '+1% poison damage mỗi debuff khác trên target.'),
  },
  {
    archetype: 'Oracle',
    hp: 920,
    atk: 42,
    def: 28,
    skill: skill(
      'MEND',
      'Mend',
      36,
      3,
      'Hồi 35% maxHP cho ally thấp nhất và cleanse 1 debuff.',
      'ally',
    ),
    passive: passive('ORACLE_FORESIGHT', 'Foresight', 'Ally dưới 30% HP nhận −15% damage.'),
  },
  // ── P3: summon / tempo / mana / risk ─────────────────────────────────
  {
    archetype: 'Necromancer',
    hp: 760,
    atk: 72,
    def: 20,
    skill: skill(
      'RAISE_THRALL',
      'Raise Thrall',
      48,
      5,
      'Triệu hồi Thrall 280 HP / 54 ATK; đánh target đã commit sau lượt bạn, chết theo owner.',
      'none',
    ),
    passive: passive('BONE_TITHE', 'Bone Tithe', '+20 mana khi ally chết.'),
  },
  {
    archetype: 'Chronarch',
    hp: 800,
    atk: 60,
    def: 25,
    skill: skill(
      'TIME_WARP',
      'Time Warp',
      40,
      4,
      '+1 CD toàn bộ skill địch (cap +2), −1 CD 1 ally.',
      'none',
    ),
    passive: passive('CHRONO_DRILL', 'Drill', 'Skill đầu tiên mỗi trận của mỗi ally −10 mana.'),
  },
  {
    archetype: 'Spellbreaker',
    hp: 920,
    atk: 78,
    def: 30,
    skill: skill(
      'MANA_DRAIN',
      'Mana Drain',
      36,
      3,
      'Đốt 25 mana địch, nhận 15, strip 1 buff.',
    ),
    passive: passive('SPELL_TAX', 'Tax', 'Skill của địch +5 mana cost.'),
  },
  {
    archetype: 'Berserker',
    hp: 1200,
    atk: 108,
    def: 25,
    skill: skill(
      'RECKLESS_SWING',
      'Reckless Swing',
      32,
      3,
      '2.2× ATK, mất 10% HP hiện tại (không chết), +25% ATK 2 lượt.',
    ),
    passive: passive('BLOODLUST', 'Bloodlust', '+1% ATK mỗi 2% HP đã mất (cap +30%).'),
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
    onceUsed: [],
    firstSkillUsed: false,
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
