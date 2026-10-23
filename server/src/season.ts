/**
 * Đọc trạng thái mùa giải từ SeasonVault để SeasonScene hiển thị.
 * Không cần ví: dùng JSON-RPC read-only. Cache 5s để client poll thoải mái.
 */
import { Contract, JsonRpcProvider } from 'ethers';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ABI = [
  'function prizePool() view returns (uint256)',
  'function totalPrincipal() view returns (uint256)',
  'function seasonEnd() view returns (uint64)',
  'function principalOf(address) view returns (uint256)',
];

const FUJI_CHAIN_ID = 43113;
const DEFAULT_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const CACHE_MS = 5_000;
const RPC_TIMEOUT_MS = 2_500;

export interface ChainConfig {
  chainId: number;
  vaultAddress: string | null;
  usdcAddress: string | null;
  seasonEnd: number;
}

export interface SeasonInfo {
  configured: boolean;
  chainId: number;
  /** bigint dạng decimal string — JSON không có bigint */
  prizePool: string;
  totalPrincipal: string;
  seasonEnd: number;
  /** Chỉ có khi query kèm ?address= */
  deposit?: string;
  error?: string;
}

interface Deployment {
  chainId?: number;
  seasonVault?: string;
  mockUsdc?: string;
}

export interface SeasonReaderOptions {
  env?: NodeJS.ProcessEnv;
  /** false = bỏ qua contracts/deployments/*.json (dùng trong test) */
  useDeploymentFile?: boolean;
}

export class SeasonReader {
  readonly chainId: number;
  readonly vaultAddress: string | null;
  readonly usdcAddress: string | null;

  private readonly provider: JsonRpcProvider | null;
  private cache: { at: number; info: SeasonInfo } | null = null;

  constructor(options: SeasonReaderOptions = {}) {
    const env = options.env ?? process.env;
    const deployment: Deployment =
      options.useDeploymentFile === false ? {} : readDeployment();

    this.chainId = Number(env.CHAIN_ID || deployment.chainId || FUJI_CHAIN_ID);
    this.vaultAddress = env.SEASON_VAULT || deployment.seasonVault || null;
    this.usdcAddress = env.USDC_ADDRESS || deployment.mockUsdc || null;

    const rpc = env.FUJI_RPC_URL || DEFAULT_RPC;
    this.provider = this.vaultAddress
      ? new JsonRpcProvider(rpc, this.chainId, { staticNetwork: true })
      : null;
  }

  get configured(): boolean {
    return this.vaultAddress !== null;
  }

  config(): ChainConfig {
    return {
      chainId: this.chainId,
      vaultAddress: this.vaultAddress,
      usdcAddress: this.usdcAddress,
      seasonEnd: this.cache?.info.seasonEnd ?? 0,
    };
  }

  async read(address?: string): Promise<SeasonInfo> {
    const base = await this.base();
    if (!address || !this.configured || !this.provider) return base;

    try {
      const vault = new Contract(this.vaultAddress!, ABI, this.provider);
      const deposit = (await withTimeout(vault.principalOf!(address))) as bigint;
      return { ...base, deposit: deposit.toString() };
    } catch (error) {
      return { ...base, error: shortError(error) };
    }
  }

  private async base(): Promise<SeasonInfo> {
    const empty: SeasonInfo = {
      configured: this.configured,
      chainId: this.chainId,
      prizePool: '0',
      totalPrincipal: '0',
      seasonEnd: 0,
    };

    if (!this.provider || !this.vaultAddress) return empty;
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.info;

    try {
      const vault = new Contract(this.vaultAddress, ABI, this.provider);
      const [pool, principal, end] = (await withTimeout(
        Promise.all([vault.prizePool!(), vault.totalPrincipal!(), vault.seasonEnd!()]),
      )) as [bigint, bigint, bigint];

      const info: SeasonInfo = {
        configured: true,
        chainId: this.chainId,
        prizePool: pool.toString(),
        totalPrincipal: principal.toString(),
        seasonEnd: Number(end),
      };
      this.cache = { at: Date.now(), info };
      return info;
    } catch (error) {
      // Cache cả lỗi để không hammer RPC hỏng
      const info: SeasonInfo = { ...empty, error: shortError(error) };
      this.cache = { at: Date.now(), info };
      return info;
    }
  }
}

function readDeployment(): Deployment {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const file = join(here, '..', '..', 'contracts', 'deployments', 'fuji.json');
    return JSON.parse(readFileSync(file, 'utf8')) as Deployment;
  } catch {
    return {};
  }
}

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RPC timeout')), RPC_TIMEOUT_MS).unref?.(),
    ),
  ]);
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 140 ? `${message.slice(0, 140)}…` : message;
}
