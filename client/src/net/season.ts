import { ENV, SERVER_HTTP_BASE } from '../env';
import { isAddress } from '../chain/abi';
import { readPrincipal, readPrizePool, readSeasonEnd, readTotalPrincipal } from '../chain/wallet';

interface ChainConfigResponse {
  chainId: number;
  vaultAddress: string | null;
  usdcAddress: string | null;
  seasonEnd: number;
}

interface SeasonResponse {
  configured: boolean;
  prizePool: string;
  totalPrincipal: string;
  seasonEnd: number;
  chainId: number;
}

export interface SeasonSnapshot {
  chainId: number;
  vaultAddress: string | null;
  usdcAddress: string | null;
  seasonEnd: number;
  prizePool: bigint | null;
  totalPrincipal: bigint | null;
  /** Principal người dùng đã nạp vào vault (nếu có ví). */
  userPrincipal: bigint | null;
  configured: boolean;
  /** server = số liệu HTTP; chain = đọc trực tiếp contract. */
  source: 'server' | 'chain' | 'none';
}

export const EMPTY_SEASON: SeasonSnapshot = {
  chainId: ENV.chainId ?? 43113,
  vaultAddress: ENV.vaultAddress,
  usdcAddress: ENV.usdcAddress,
  seasonEnd: ENV.seasonEnd,
  prizePool: null,
  totalPrincipal: null,
  userPrincipal: null,
  configured: false,
  source: 'none',
};

async function getJson<T>(path: string, timeoutMs = 4_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${SERVER_HTTP_BASE}${path}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function toBigInt(value: string | number | null | undefined): bigint | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function normalizeAddress(value: string | null | undefined): string | null {
  return isAddress(value) ? value : null;
}

/**
 * Ưu tiên env VITE_*, sau đó GET /config + GET /season.
 * Nếu có ví + vault thì đọc số liệu trực tiếp từ contract (chính xác hơn).
 */
export async function loadSeasonSnapshot(owner: string | null): Promise<SeasonSnapshot> {
  const [config, season] = await Promise.all([
    getJson<ChainConfigResponse>('/config'),
    getJson<SeasonResponse>('/season'),
  ]);

  const vaultAddress = ENV.vaultAddress ?? normalizeAddress(config?.vaultAddress);
  const usdcAddress = ENV.usdcAddress ?? normalizeAddress(config?.usdcAddress);
  const chainId = ENV.chainId ?? config?.chainId ?? season?.chainId ?? 43113;
  let seasonEnd = ENV.seasonEnd || config?.seasonEnd || season?.seasonEnd || 0;
  let prizePool = toBigInt(season?.prizePool);
  let totalPrincipal = toBigInt(season?.totalPrincipal);
  let source: SeasonSnapshot['source'] = season ? 'server' : 'none';
  let configured = Boolean(season?.configured) || Boolean(vaultAddress);

  if (vaultAddress) {
    const [poolResult, principalResult, endResult, userPrincipalResult] = await Promise.allSettled([
      readPrizePool(vaultAddress),
      readTotalPrincipal(vaultAddress),
      readSeasonEnd(vaultAddress),
      owner ? readPrincipal(vaultAddress, owner) : Promise.resolve(0n),
    ]);

    if (poolResult.status === 'fulfilled') {
      prizePool = poolResult.value;
      source = 'chain';
      configured = true;
    }
    if (principalResult.status === 'fulfilled') totalPrincipal = principalResult.value;
    if (endResult.status === 'fulfilled' && endResult.value > 0) seasonEnd = endResult.value;

    return {
      chainId,
      vaultAddress,
      usdcAddress,
      seasonEnd,
      prizePool,
      totalPrincipal,
      userPrincipal: owner && userPrincipalResult.status === 'fulfilled' ? userPrincipalResult.value : null,
      configured,
      source,
    };
  }

  return {
    chainId,
    vaultAddress,
    usdcAddress,
    seasonEnd,
    prizePool,
    totalPrincipal,
    userPrincipal: null,
    configured,
    source,
  };
}
