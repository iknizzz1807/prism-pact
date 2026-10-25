/**
 * Combat math — README mục 4.6, 4.7, 4.11.
 * Pure helpers, mutate HeroState được truyền vào (server sẽ mutate Colyseus state).
 * Client import để hiển thị tooltip/preview nhưng KHÔNG được dùng để tính kết quả.
 */
import { CONFIG } from './config.js';
import type { Buff, BuffKind, GemCounts, HeroState } from './types.js';

// ── Chỉ số hiệu dụng ───────────────────────────────────────────────────

export function buffPct(hero: HeroState, kind: BuffKind): number {
  return hero.buffs
    .filter((b) => b.kind === kind)
    .reduce((sum, b) => sum + b.pct, 0);
}

export function hasBuff(hero: HeroState, kind: BuffKind): boolean {
  return hero.buffs.some((b) => b.kind === kind && (kind === 'TAUNT' || b.turns > 0));
}

/**
 * ATK hiệu dụng:
 * - buff/debuff cá nhân
 * - Buffer còn sống → cả đội +10%
 * - Burst còn sống + đủ 3 người → +20% cho chính nó
 */
export function effectiveAtk(hero: HeroState, allies: readonly HeroState[]): number {
  const up = buffPct(hero, 'ATK_UP');
  const down = buffPct(hero, 'ATK_DOWN');
  let value = hero.atk * (1 + up) * Math.max(0, 1 - down);

  if (allies.some((a) => a.alive && a.archetype === 'Buffer')) value *= 1.1;
  if (hero.archetype === 'Burst' && allies.filter((a) => a.alive).length === 3) value *= 1.2;
  if (hero.archetype === 'Berserker') {
    const missing = 1 - hero.hp / Math.max(1, hero.maxHp);
    value *= 1 + Math.min(0.3, missing * 0.5);
  }

  return Math.max(0, value);
}

export function effectiveDef(hero: HeroState, allies: readonly HeroState[] = [hero]): number {
  let value =
    hero.def *
    (1 + buffPct(hero, 'DEF_UP')) *
    Math.max(0, 1 - buffPct(hero, 'DEF_DOWN'));
  if (hero.archetype === 'Tank' && hero.hp < hero.maxHp * 0.5) value *= 1.3;
  // Paladin aura: đồng minh dưới 40% HP nhận +15% DEF.
  if (
    hero.hp < hero.maxHp * 0.4 &&
    allies.some((a) => a.alive && a.archetype === 'Paladin')
  ) {
    value *= 1.15;
  }
  return Math.max(0, value);
}

// ── Sát thương ─────────────────────────────────────────────────────────

/** damage = raw * K / (K + DEF), tối thiểu MIN_DAMAGE. */
export function mitigated(raw: number, def: number): number {
  const d = Math.max(0, def);
  return Math.max(CONFIG.MIN_DAMAGE, Math.round((Math.max(0, raw) * CONFIG.DEF_K) / (CONFIG.DEF_K + d)));
}

export interface DamageOptions {
  /** 0.5 = bỏ qua 50% DEF (Execute). */
  ignoreDefPct?: number;
  /** true = bỏ qua toàn bộ shield (Deadshot). */
  ignoreShield?: boolean;
  /** Toàn đội của target — dùng cho aura Paladin. */
  allies?: readonly HeroState[];
}

/**
 * Trừ HP (shield hấp thụ trước). Trả về lượng HP thực sự mất.
 */
export function dealDamage(target: HeroState, raw: number, opts: DamageOptions = {}): number {
  if (!target.alive) return 0;
  if (target.buffs.some((b) => b.kind === 'INVINCIBLE')) return 0;

  const def = effectiveDef(target, opts.allies ?? [target]) * (1 - (opts.ignoreDefPct ?? 0));
  let amount = mitigated(raw, def);

  // Oracle aura: ally dưới 30% HP nhận −15% damage.
  const targetAllies = opts.allies ?? [target];
  if (
    target.hp < target.maxHp * 0.3 &&
    targetAllies.some((a) => a.alive && a.archetype === 'Oracle')
  ) {
    amount = Math.max(CONFIG.MIN_DAMAGE, Math.round(amount * 0.85));
  }

  if (!opts.ignoreShield && target.shield > 0) {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    amount -= absorbed;
  }

  const before = target.hp;
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp === 0) {
    target.alive = false;
    target.shield = 0;
  }
  return before - target.hp;
}

/** True damage: bỏ qua DEF và shield. Invincible vẫn chặn. */
export function dealTrueDamage(target: HeroState, raw: number): number {
  if (!target.alive || raw <= 0) return 0;
  if (target.buffs.some((b) => b.kind === 'INVINCIBLE')) return 0;
  const amount = Math.round(raw);
  const before = target.hp;
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp === 0) {
    target.alive = false;
    target.shield = 0;
  }
  return before - target.hp;
}

/** +30% nếu Assassin đánh target <30% HP; +15% nếu team có Debuffer và target đang bị debuff. */
export function damageMultiplier(
  attacker: HeroState,
  attackerAllies: readonly HeroState[],
  target: HeroState,
): number {
  let mult = 1;
  if (attacker.archetype === 'Assassin' && target.hp / target.maxHp < 0.3) mult *= 1.3;
  if (attacker.archetype === 'Executioner' && effectiveDef(target) >= 40) mult *= 1.25;
  if (attacker.archetype === 'Sniper' && target.hp === target.maxHp) mult *= 1.15;
  if (attacker.archetype === 'Pyromancer' && target.buffs.some((b) => b.kind === 'BURN')) mult *= 1.15;
  const hasDebuffer = attackerAllies.some((a) => a.alive && a.archetype === 'Debuffer');
  const targetDebuffed = target.buffs.some((b) => b.kind === 'ATK_DOWN' || b.kind === 'DEF_DOWN');
  if (hasDebuffer && targetDebuffed) mult *= 1.15;
  return mult;
}

// ── Hồi máu / shield / mana ────────────────────────────────────────────

/** ceil() an toàn với sai số float (0.1*3 !== 0.3 trong JS). */
export const ceilSafe = (x: number): number => Math.ceil(x - 1e-9);

export function healHero(hero: HeroState, amount: number): number {
  if (!hero.alive || amount <= 0) return 0;
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + amount);
  return hero.hp - before;
}

/** Hồi theo % maxHP cho toàn bộ tướng còn sống. Trả về tổng HP hồi. */
export function healTeam(team: readonly HeroState[], pctOfMax: number): number {
  let total = 0;
  for (const hero of team) {
    if (!hero.alive) continue;
    total += healHero(hero, ceilSafe(hero.maxHp * pctOfMax));
  }
  return total;
}

export function addShield(hero: HeroState, amount: number): number {
  if (!hero.alive || amount <= 0) return 0;
  const cap = Math.floor(hero.maxHp * CONFIG.SHIELD_CAP_PCT + 1e-9);
  const before = hero.shield;
  hero.shield = Math.min(cap, hero.shield + amount);
  return hero.shield - before;
}

export interface GemEconomyResult {
  mana: number;
  healed: number;
  shielded: number;
}

/**
 * Áp dụng 🩸 / 🛡️ / 💧 từ kết quả match-3.
 * ⚔️ được xử lý riêng bởi performBasicAttacks.
 */
export function applyGemEconomy(
  team: readonly HeroState[],
  gems: GemCounts,
  mana: number,
): GemEconomyResult {
  let healed = 0;
  let shielded = 0;

  for (const hero of team) {
    if (!hero.alive) continue;
    if (gems.HP > 0) {
      const perGem = ceilSafe(hero.maxHp * CONFIG.HEAL_PCT_PER_GEM);
      healed += healHero(hero, perGem * gems.HP);
    }
    if (gems.SHIELD > 0) {
      const perGem = ceilSafe(hero.maxHp * CONFIG.SHIELD_PCT_PER_GEM);
      shielded += addShield(hero, perGem * gems.SHIELD);
    }
  }

  return {
    mana: Math.min(CONFIG.MANA_MAX, mana + gems.MANA * CONFIG.MANA_PER_GEM),
    healed,
    shielded,
  };
}

// ── Đòn đánh thường ────────────────────────────────────────────────────

export interface HitLog {
  attackerUid: string;
  targetUid: string;
  raw: number;
  dealt: number;
  absorbed: number;
  killed: boolean;
}

export interface BasicAttackArgs {
  /** Tướng còn sống, đúng thứ tự slot. */
  attackers: readonly HeroState[];
  /** Toàn đội của attacker (kể cả đã chết) — dùng cho passive team. */
  allies: readonly HeroState[];
  /** Target hiện tại (có thể đã chết → tự redirect). */
  target: HeroState;
  /** Toàn đội địch theo thứ tự slot — để redirect khi target chết. */
  enemies: readonly HeroState[];
  /** Số hit thô = số gem ⚔️ nổ. */
  hits: number;
}

export interface BasicAttackResult {
  scoredHits: number;
  overflowMana: number;
  totalDealt: number;
  absorbedTotal: number;
  healed: number;
  hits: HitLog[];
}

/**
 * Resolve toàn bộ hit ⚔️ của một lượt:
 * - round-robin theo slot (D-01)
 * - damage cap DAMAGE_CAP_HITS, hit dư → +1 mana/hit
 * - target chết → dồn sang tướng còn sống kế tiếp
 * - team có Bruiser → lifesteal 15%
 */
export function performBasicAttacks(args: BasicAttackArgs): BasicAttackResult {
  const living = args.attackers.filter((a) => a.alive);
  const requested = Math.max(0, Math.floor(args.hits));
  const scoredHits = Math.min(requested, CONFIG.DAMAGE_CAP_HITS);
  const overflowMana = requested - scoredHits;

  const result: BasicAttackResult = {
    scoredHits: 0,
    overflowMana,
    totalDealt: 0,
    absorbedTotal: 0,
    healed: 0,
    hits: [],
  };
  if (living.length === 0 || scoredHits === 0) return result;

  const hasLeech = args.allies.some((a) => a.alive && a.archetype === 'Bruiser');
  let current: HeroState | null = args.target.alive ? args.target : nextAlive(args.enemies, null);

  for (let k = 0; k < scoredHits; k++) {
    if (!current) break;
    const attacker = living[k % living.length]!;
    if (!attacker.alive) continue;

    let raw = effectiveAtk(attacker, args.allies) * damageMultiplier(attacker, args.allies, current);
    if (attacker.archetype === 'Cleaver' && args.enemies.filter((h) => h.alive).length === 3) {
      raw *= 1.15;
    }
    const shieldBefore = current.shield;
    const dealt = dealDamage(current, raw, { allies: args.enemies });
    const absorbed = Math.max(0, shieldBefore - current.shield);

    result.scoredHits++;
    result.totalDealt += dealt;
    result.absorbedTotal += absorbed;
    result.hits.push({
      attackerUid: attacker.uid,
      targetUid: current.uid,
      raw,
      dealt,
      absorbed,
      killed: !current.alive,
    });

    // Juggernaut passive: bị basic hit → +5% ATK (cap +20%).
    if (current.archetype === 'Juggernaut' && current.alive && buffPct(current, 'ATK_UP') < 0.2) {
      current.buffs.push({ kind: 'ATK_UP', pct: 0.05, turns: 2 });
    }

    // Iron Thorns: phản 40% damage basic đã gây ra, không kích hoạt lại thorns.
    if (current.buffs.some((b) => b.kind === 'THORNS') && dealt > 0) {
      dealDamage(attacker, Math.round(dealt * 0.4), { allies: args.allies });
    }

    if (hasLeech && dealt > 0) {
      result.healed += healHero(attacker, Math.round(dealt * 0.15));
    }

    if (!current.alive) current = nextAlive(args.enemies, current);
  }

  return result;
}

function nextAlive(team: readonly HeroState[], exclude: HeroState | null): HeroState | null {
  let passed = exclude === null;
  for (const hero of team) {
    if (!passed) {
      if (hero === exclude) passed = true;
      continue;
    }
    if (hero.alive) return hero;
  }
  return team.find((h) => h.alive) ?? null;
}

// ── Target & taunt ─────────────────────────────────────────────────────

export function forcedTarget(defenders: readonly HeroState[]): HeroState | null {
  return defenders.find((h) => h.alive && h.buffs.some((b) => b.kind === 'TAUNT')) ?? null;
}

/**
 * Target thực tế khi tấn công: taunt > target đã chọn > slot 1 còn sống.
 * README 4.5.
 */
export function resolveAttackTarget(
  defenders: readonly HeroState[],
  requestedUid: string | null,
): HeroState | null {
  const taunt = forcedTarget(defenders);
  if (taunt) return taunt;
  if (requestedUid) {
    const chosen = defenders.find((h) => h.alive && h.uid === requestedUid);
    if (chosen) return chosen;
  }
  return defenders.find((h) => h.alive) ?? null;
}

/** Gọi sau lượt của đối thủ: taunt chỉ tồn tại đúng 1 lượt của địch. */
export function expireTaunts(team: HeroState[]): void {
  for (const hero of team) {
    hero.buffs = hero.buffs.filter((b) => b.kind !== 'TAUNT');
  }
}

// ── Vòng đời lượt ──────────────────────────────────────────────────────

const DOT_KINDS: ReadonlySet<BuffKind> = new Set(['BURN', 'POISON']);
const CLEANSE_PRIORITY: readonly BuffKind[] = [
  'POISON',
  'BURN',
  'DOT_DOWN',
  'DEF_DOWN',
  'ATK_DOWN',
  'SKILL_TAX',
];

export function isDebuffBuff(buff: Buff): boolean {
  return CLEANSE_PRIORITY.includes(buff.kind);
}

/** Xoá 1 debuff theo thứ tự ưu tiên DoT trước. */
export function cleanseOne(hero: HeroState): Buff | null {
  for (const kind of CLEANSE_PRIORITY) {
    const index = hero.buffs.findIndex((b) => b.kind === kind);
    if (index >= 0) {
      const [removed] = hero.buffs.splice(index, 1);
      return removed ?? null;
    }
  }
  return null;
}

/** Spellbreaker strip: bỏ 1 buff có lợi (Invincible/Thorns/ATK_UP/DEF_UP). */
export function stripOneBuff(hero: HeroState): Buff | null {
  const priority: readonly BuffKind[] = ['INVINCIBLE', 'THORNS', 'ATK_UP', 'DEF_UP'];
  for (const kind of priority) {
    const index = hero.buffs.findIndex((b) => b.kind === kind);
    if (index >= 0) {
      const [removed] = hero.buffs.splice(index, 1);
      return removed ?? null;
    }
  }
  return null;
}

/**
 * Tick Burn/Poison đầu turn của bên bị ảnh hưởng.
 * - true damage: bỏ qua DEF + shield
 * - Invincible KHÔNG chặn DoT
 * - Poison +1% mỗi debuff khác trên target (cap 6%)
 * - DOT_DOWN giảm damage
 */
export function tickDamageOverTime(team: readonly HeroState[]): { total: number; logs: string[] } {
  let total = 0;
  const logs: string[] = [];

  for (const hero of team) {
    if (!hero.alive) continue;
    for (const buff of hero.buffs) {
      if (!DOT_KINDS.has(buff.kind)) continue;
      let pct = buff.pct;
      if (buff.kind === 'POISON') {
        const otherDebuffs = hero.buffs.filter((b) => b !== buff && isDebuffBuff(b)).length;
        pct = Math.min(0.06, pct + otherDebuffs * 0.01);
      }
      pct *= Math.max(0, 1 - buffPct(hero, 'DOT_DOWN'));
      const loss = Math.max(1, Math.round(hero.maxHp * pct));
      const before = hero.hp;
      hero.hp = Math.max(0, hero.hp - loss);
      total += before - hero.hp;
      logs.push(`${hero.uid} ${buff.kind} -${before - hero.hp} HP`);
      if (hero.hp === 0) {
        hero.alive = false;
        hero.shield = 0;
      }
    }
  }

  return { total, logs };
}

/** Đầu lượt: passive hồi máu (Healer), sau đó tick Burn/Poison. */
export function startTurn(team: readonly HeroState[]): string[] {
  const logs: string[] = [];
  for (const hero of team) {
    if (!hero.alive || hero.archetype !== 'Healer') continue;
    const healed = healHero(hero, ceilSafe(hero.maxHp * 0.05));
    if (healed > 0) logs.push(`${hero.uid} (Healer) hồi ${healed} HP`);
  }
  logs.push(...tickDamageOverTime(team).logs);
  return logs;
}

/** Cuối lượt: giảm cooldown + tick buff/debuff (trừ TAUNT). */
export function endTurn(team: HeroState[]): void {
  for (const hero of team) {
    if (hero.cd > 0) hero.cd -= 1;
    hero.buffs = hero.buffs
      .map((b: Buff): Buff => (b.kind === 'TAUNT' ? b : { ...b, turns: b.turns - 1 }))
      .filter((b) => b.kind === 'TAUNT' || b.turns > 0);
  }
}

/** Sudden Death: trừ thẳng % maxHP, shield KHÔNG hấp thụ. */
export function applySuddenDeath(
  team: readonly HeroState[],
  pct: number = CONFIG.SUDDEN_DEATH_HP_PCT,
): number {
  let total = 0;
  for (const hero of team) {
    if (!hero.alive) continue;
    const loss = Math.round(hero.maxHp * pct);
    const before = hero.hp;
    hero.hp = Math.max(0, hero.hp - loss);
    total += before - hero.hp;
    if (hero.hp === 0) {
      hero.alive = false;
      hero.shield = 0;
    }
  }
  return total;
}
