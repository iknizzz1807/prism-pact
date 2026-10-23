/** Cấu hình build-time. Env VITE_* luôn thắng giá trị lấy từ server. */

function str(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const rawServerInput = str(import.meta.env.VITE_SERVER_URL) ?? 'ws://localhost:2567';
const rawServer = /^[a-z]+:\/\//i.test(rawServerInput) ? rawServerInput : `ws://${rawServerInput}`;

/** ws(s):// URL used by GameClient. */
export const SERVER_WS_URL = rawServer.replace(/^http(s?):\/\//i, 'ws$1://').replace(/\/+$/, '');

/** HTTP origin used for GET /config and GET /season. */
export const SERVER_HTTP_BASE = rawServer
  .replace(/^ws(s?):\/\//i, 'http$1://')
  .replace(/\/+$/, '');

const chainIdRaw = Number(str(import.meta.env.VITE_CHAIN_ID) ?? '');
const seasonEndRaw = Number(str(import.meta.env.VITE_SEASON_END) ?? '');

export const ENV = {
  /** null = không override; dùng chainId server trả về. */
  chainId: Number.isFinite(chainIdRaw) && chainIdRaw > 0 ? chainIdRaw : null,
  vaultAddress: str(import.meta.env.VITE_VAULT_ADDRESS),
  usdcAddress: str(import.meta.env.VITE_USDC_ADDRESS),
  seasonEnd: Number.isFinite(seasonEndRaw) && seasonEndRaw > 0 ? seasonEndRaw : 0,
} as const;
