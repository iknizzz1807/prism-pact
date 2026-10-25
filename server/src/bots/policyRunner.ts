/**
 * Chạy policy chính (Jev) với timeout + kiểm tra confidence.
 * Mọi lỗi/timeout/option lạ/confidence thấp đều fallback về heuristic.
 */
import type { BattleState, Side } from '@prism-pact/shared';
import { INTENT_WEIGHTS, type BotPolicy, type PlanContext, type TurnPlan } from './types.js';

export interface PolicyRunnerOptions {
  primary: BotPolicy;
  fallback: BotPolicy;
  /** Toàn bộ chain skill → target → intent. */
  timeoutMs: number;
  minConfidence: number;
  minMargin: number;
  log?: (message: string) => void;
}

export class PolicyRunner implements BotPolicy {
  readonly name: string;

  private readonly primary: BotPolicy;
  private readonly fallback: BotPolicy;
  private readonly timeoutMs: number;
  private readonly minConfidence: number;
  private readonly minMargin: number;
  private readonly log: (message: string) => void;

  constructor(options: PolicyRunnerOptions) {
    this.name = `${options.primary.name}+fallback`;
    this.primary = options.primary;
    this.fallback = options.fallback;
    this.timeoutMs = options.timeoutMs;
    this.minConfidence = options.minConfidence;
    this.minMargin = options.minMargin;
    this.log = options.log ?? (() => undefined);
  }

  async planTurn(
    state: BattleState,
    side: Side,
    ctx: PlanContext = {},
  ): Promise<TurnPlan> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (ctx.signal) {
      if (ctx.signal.aborted) controller.abort();
      else ctx.signal.addEventListener('abort', onAbort, { once: true });
    }

    if (controller.signal.aborted) {
      ctx.signal?.removeEventListener('abort', onAbort);
      return this.fallbackPlan(state, side, 'aborted');
    }

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    // Race cả khi fetch không tôn trọng AbortSignal — timeout vẫn phải fallback.
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new Error('aborted')), {
        once: true,
      });
    });

    try {
      const plan = await Promise.race([
        this.primary.planTurn(state, side, { signal: controller.signal }),
        aborted,
      ]);
      if (!plan) return this.fallbackPlan(state, side, 'empty-plan');
      const low = this.lowConfidence(plan);
      if (low) return this.fallbackPlan(state, side, low);
      return plan;
    } catch (error) {
      const reason = timedOut
        ? 'timeout'
        : controller.signal.aborted
          ? 'aborted'
          : error instanceof Error
            ? error.message
            : String(error);
      return this.fallbackPlan(state, side, reason);
    } finally {
      clearTimeout(timer);
      ctx.signal?.removeEventListener('abort', onAbort);
    }
  }

  private lowConfidence(plan: TurnPlan): string | null {
    if (plan.confidence !== undefined && plan.confidence < this.minConfidence) {
      return `low-confidence ${plan.confidence.toFixed(2)} < ${this.minConfidence}`;
    }
    if (plan.margin !== undefined && plan.margin < this.minMargin) {
      return `low-margin ${plan.margin.toFixed(2)} < ${this.minMargin}`;
    }
    return null;
  }

  private async fallbackPlan(
    state: BattleState,
    side: Side,
    reason: string,
  ): Promise<TurnPlan> {
    this.log(`[bot] ${this.primary.name} → fallback (${reason})`);
    const plan = await this.fallback.planTurn(state, side);
    if (!plan) {
      return {
        skill: null,
        targetUid: null,
        intent: 'BALANCED',
        weights: INTENT_WEIGHTS.BALANCED,
        source: 'heuristic',
        fallbackReason: reason,
      };
    }
    return { ...plan, source: 'heuristic', fallbackReason: reason };
  }
}
