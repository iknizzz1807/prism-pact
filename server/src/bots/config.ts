/**
 * Đọc env và tạo policy cho từng MatchRoom.
 *
 *   BOT_POLICY=heuristic (mặc định) → giữ nguyên bot cũ, không gọi mạng.
 *   BOT_POLICY=jev                 → Jev + fallback heuristic.
 */
import type { Rng } from '@prism-pact/shared';
import { HeuristicPolicy } from './heuristicPolicy.js';
import {
  JevPolicy,
  VonPolicy,
  type JevConfig,
  type JevFetch,
} from './jevPolicy.js';
import { PolicyRunner } from './policyRunner.js';
import type { BotPolicy } from './types.js';

export type BotPolicyFactory = (rng: Rng) => BotPolicy | null;

export interface BotPolicyFactoryOptions {
  env?: NodeJS.ProcessEnv;
  fetch?: JevFetch;
  log?: (message: string) => void;
}

function readNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max = Number.POSITIVE_INFINITY,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readBoolean(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function createBotPolicyFactory(
  options: BotPolicyFactoryOptions = {},
): BotPolicyFactory {
  const env = options.env ?? process.env;
  const mode = (env.BOT_POLICY ?? 'heuristic').trim().toLowerCase();
  if (mode !== 'jev' && mode !== 'von') return () => null;

  const logDecisions =
    readBoolean(env.BOT_LOG_DECISIONS) ||
    readBoolean(env.JEV_LOG_DECISIONS) ||
    readBoolean(env.VON_LOG_DECISIONS);
  const fetchImpl = options.fetch ?? (globalThis.fetch.bind(globalThis) as JevFetch);
  const logger = options.log ?? (logDecisions ? console.warn : () => undefined);

  let config: JevConfig;
  let timeoutMs: number;
  let minConfidence: number;
  let minMargin: number;

  if (mode === 'von') {
    config = {
      // Von local không bắt buộc auth; nếu có VON_API_KEY thì gửi Bearer.
      apiKey: env.VON_API_KEY?.trim() || '',
      model: env.VON_MODEL?.trim() || 'von-1.3.0',
      baseUrl: env.VON_BASE_URL?.trim() || 'http://127.0.0.1:8000/v1/systemone',
      ...(env.VON_REFERER?.trim() ? { referer: env.VON_REFERER.trim() } : {}),
      title: env.VON_TITLE?.trim() || 'Prism Pact (Von)',
      logDecisions,
    };
    timeoutMs = readNumber(env.VON_TIMEOUT_MS, 2000, 100, 120_000);
    minConfidence = readNumber(env.VON_MIN_CONFIDENCE, 0.2, 0, 1);
    minMargin = readNumber(env.VON_MIN_MARGIN, 0.05, 0, 1);
  } else {
    const apiKey = env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      const warn = options.log ?? console.warn;
      warn('[bot] BOT_POLICY=jev nhưng thiếu OPENROUTER_API_KEY — dùng heuristic.');
      return () => null;
    }

    config = {
      apiKey,
      model: env.JEV_MODEL?.trim() || 'typesafe/jev-1.14',
      baseUrl: env.JEV_BASE_URL?.trim() || 'https://openrouter.ai/api/v1/systemone',
      ...(env.JEV_REFERER?.trim() ? { referer: env.JEV_REFERER.trim() } : {}),
      title: env.JEV_TITLE?.trim() || 'Prism Pact',
      logDecisions,
    };
    timeoutMs = readNumber(env.JEV_TIMEOUT_MS, 6000, 100, 120_000);
    minConfidence = readNumber(env.JEV_MIN_CONFIDENCE, 0.2, 0, 1);
    minMargin = readNumber(env.JEV_MIN_MARGIN, 0.05, 0, 1);
  }

  return (rng) =>
    new PolicyRunner({
      primary:
        mode === 'von'
          ? new VonPolicy(config, fetchImpl)
          : new JevPolicy(config, fetchImpl),
      fallback: new HeuristicPolicy(rng),
      timeoutMs,
      minConfidence,
      minMargin,
      log: logger,
    });
}
