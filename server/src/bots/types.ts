/**
 * Hợp đồng chung cho bot policy.
 *
 * Policy chỉ quyết định cấp cao: skill / target / intent + trọng số ngọc.
 * Việc tìm swap cụ thể vẫn do local brute-force trong `shared/src/bot.ts`.
 */
import type { BattleState, GemWeights, Side } from '@prism-pact/shared';

export const GEM_INTENTS = [
  'FINISH',
  'SUSTAIN',
  'CHARGE',
  'CLEANSE',
  'SETUP',
  'BALANCED',
] as const;

export type GemIntent = (typeof GEM_INTENTS)[number];

/** Intent → trọng số ngọc cho local swap search. */
export const INTENT_WEIGHTS: Record<GemIntent, Readonly<GemWeights>> = {
  FINISH: { ATK: 3, HP: 0.2, MANA: 0.3, SHIELD: 0.2 },
  SUSTAIN: { ATK: 0.5, HP: 2, MANA: 0.5, SHIELD: 3 },
  CHARGE: { ATK: 1, HP: 0.5, MANA: 3, SHIELD: 0.5 },
  CLEANSE: { ATK: 0.5, HP: 3, MANA: 0.5, SHIELD: 1 },
  SETUP: { ATK: 1.5, HP: 0.5, MANA: 1.5, SHIELD: 0.5 },
  BALANCED: { ATK: 2, HP: 0.6, MANA: 0.6, SHIELD: 0.5 },
};

export const INTENT_CRITERIA: Record<GemIntent, string> = {
  FINISH:
    'Target enemy is <=30% HP and you have enough ATK/damage to kill or severely damage this turn.',
  SUSTAIN:
    'Your team is <=40% HP or the enemy has high burst/AoE; prioritize HP and SHIELD to survive.',
  CHARGE: 'You lack mana for a key skill; prioritize MANA.',
  CLEANSE:
    'Your team has Burn, Poison, or a harmful debuff that should be removed; prioritize cleanse/heal.',
  SETUP:
    'The enemy has shields/buffs or your team needs DEF shred/control before damage; prioritize setup.',
  BALANCED: 'No urgent condition; take efficient value across gem types.',
};

export interface TurnPlan {
  /** Skill muốn dùng. null/undefined = không dùng skill lượt này. */
  skill?: { casterUid: string; targetUid?: string | null } | null;
  /** Target cho basic attack (phải là tướng địch). */
  targetUid?: string | null;
  intent: GemIntent;
  /** Trọng số ngọc đã map từ intent. */
  weights: Readonly<GemWeights>;
  source: 'jev' | 'von' | 'heuristic';
  /** Confidence thấp nhất trong chain (0..1). */
  confidence?: number;
  /** Top1 − top2 nhỏ nhất trong chain (0..1). */
  margin?: number;
  /** Có khi policy chính lỗi/timeout/confidence thấp và đã fallback. */
  fallbackReason?: string;
}

export interface PlanContext {
  signal?: AbortSignal;
}

export interface BotPolicy {
  readonly name: string;
  planTurn(state: BattleState, side: Side, ctx?: PlanContext): Promise<TurnPlan | null>;
}
