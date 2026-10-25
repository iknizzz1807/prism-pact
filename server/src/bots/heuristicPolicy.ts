/**
 * Policy heuristic hiện tại, tách khỏi `chooseAction` để dùng làm fallback
 * khi Jev lỗi/timeout/confidence thấp.
 *
 * Không chọn swap ở đây — MatchRoom vẫn brute-force swap bằng trọng số intent.
 */
import { canUseSkill, otherSide } from '@prism-pact/shared';
import type { BattleState, BotOptions, Rng, Side } from '@prism-pact/shared';
import { INTENT_WEIGHTS, type BotPolicy, type PlanContext, type TurnPlan } from './types.js';

/** Target ưu tiên giống bot cũ: Healer trước, sau đó tướng HP thấp nhất. */
export function preferredEnemyTarget(state: BattleState, side: Side): string | null {
  const enemies = state.sides[otherSide(side)].heroes.filter((h) => h.alive);
  const preferred =
    enemies.find((h) => h.archetype === 'Healer') ??
    [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  return preferred?.uid ?? null;
}

export class HeuristicPolicy implements BotPolicy {
  readonly name = 'heuristic';

  constructor(
    private readonly rng: Rng,
    private readonly opts: BotOptions = {},
  ) {}

  async planTurn(state: BattleState, side: Side, _ctx?: PlanContext): Promise<TurnPlan | null> {
    const active = state.sides[side];
    const targetUid = preferredEnemyTarget(state, side);

    let skill: TurnPlan['skill'] = null;
    if (this.rng() < (this.opts.skillChance ?? 0.7)) {
      const caster = active.heroes.find((h) => h.alive && canUseSkill(h, active.mana) === null);
      if (caster) skill = { casterUid: caster.uid, targetUid };
    }

    return {
      skill,
      targetUid,
      intent: 'BALANCED',
      weights: INTENT_WEIGHTS.BALANCED,
      source: 'heuristic',
    };
  }
}
