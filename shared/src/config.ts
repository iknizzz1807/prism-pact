/**
 * Single source of truth cho toàn bộ con số cân bằng.
 * Mọi module (client + server) PHẢI import từ đây, không hardcode.
 * Xem README mục 4.12.
 */
export const CONFIG = {
  // ── Board ────────────────────────────────────────────────────────────
  BOARD_SIZE: 8,
  GEM_TYPES: ['ATK', 'HP', 'MANA', 'SHIELD'] as const,
  GEM_SPAWN_WEIGHT: { ATK: 0.25, HP: 0.25, MANA: 0.25, SHIELD: 0.25 } as const,

  // ── Timing (ms) — server dùng, client chỉ đọc để render timer ────────
  TURN_TIME_MS: 20_000,
  DRAFT_PICK_TIME_MS: 30_000,
  DRAFT_BAN_TIME_MS: 20_000,
  RECONNECT_GRACE_MS: 20_000,

  // ── Match rules ─────────────────────────────────────────────────────
  MAX_TURNS: 50, // tổng số lượt (25 mỗi bên) → kích hoạt Sudden Death
  SUDDEN_DEATH_HP_PCT: 0.05, // 5% maxHP mỗi lượt mỗi bên
  DAMAGE_CAP_HITS: 5, // tối đa 5 hit ⚔️ được tính damage/lượt
  MAX_CASCADES: 20, // chặn vòng lặp cascade vô hạn (an toàn)

  // Ngọc đặc biệt
  BOMB_MATCH_LENGTH: 4,
  RAINBOW_MATCH_LENGTH: 5,
  ENABLE_RAINBOW: false, // T1 tắt (README 3.3), bật ở T2

  // ── Gem values ──────────────────────────────────────────────────────
  MANA_PER_GEM: 1,
  MANA_MAX: 100,
  HEAL_PCT_PER_GEM: 0.01, // +1% maxHP/tướng mỗi gem 🩸
  SHIELD_PCT_PER_GEM: 0.01, // +1% maxHP/tướng mỗi gem 🛡️
  SHIELD_CAP_PCT: 0.6, // 60% maxHP/tướng

  // ── Damage ──────────────────────────────────────────────────────────
  DEF_K: 100, // damage = raw * 100 / (100 + DEF)
  MIN_DAMAGE: 1,

  // ── Draft ───────────────────────────────────────────────────────────
  ROSTER_SIZE: 8,
  PICKS_PER_SIDE: 4,
  PICKS_PER_ROUND: 2,
  BANS_PER_SIDE: 1,
  DRAFT_ROUNDS: 2,

  // ── Season / economy ────────────────────────────────────────────────
  MIN_STAKE_USDC: 50,
  SEASON_LENGTH_DAYS: 14,
  PRIZE_TOP_PCT: 0.3,
} as const;

export type Config = typeof CONFIG;
export type GemTypeConfig = (typeof CONFIG.GEM_TYPES)[number];
