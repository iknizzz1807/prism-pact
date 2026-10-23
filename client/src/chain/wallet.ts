import { FUJI, allowanceData, approveData, balanceOfData, decodeUint, depositData, isAddress, principalOfData, SELECTOR } from './abi';

export interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export interface WalletSession {
  address: string;
  chainId: number;
}

function provider(): Eip1193Provider | null {
  return typeof window !== 'undefined' && window.ethereum ? window.ethereum : null;
}

export function hasWallet(): boolean {
  return provider() !== null;
}

function requireProvider(): Eip1193Provider {
  const p = provider();
  if (!p) throw new WalletError('Không tìm thấy ví Web3. Hãy cài MetaMask hoặc Core.');
  return p;
}

function parseChainId(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('0x')) return Number.parseInt(trimmed.slice(2), 16);
    return Number(trimmed);
  }
  return 0;
}

function errorCode(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'number') return code;
  }
  return null;
}

export function walletErrorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code === 4001) return 'Bạn đã từ chối yêu cầu trong ví.';
  if (code === 4100) return 'Ví chưa cấp quyền cho ứng dụng này.';
  if (code === 4200) return 'Ví không hỗ trợ thao tác này.';
  if (error instanceof Error) return error.message;
  return 'Lỗi ví không xác định.';
}

async function accounts(p: Eip1193Provider, prompt: boolean): Promise<string[]> {
  const result = await p.request({ method: prompt ? 'eth_requestAccounts' : 'eth_accounts' });
  if (!Array.isArray(result)) return [];
  return result.filter((item): item is string => typeof item === 'string' && isAddress(item));
}

async function currentChainId(p: Eip1193Provider): Promise<number> {
  return parseChainId(await p.request({ method: 'eth_chainId' }));
}

/** Đảm bảo ví đang ở Avalanche Fuji; tự thêm chain nếu ví chưa biết. */
export async function ensureFuji(p: Eip1193Provider = requireProvider()): Promise<void> {
  const chainId = await currentChainId(p);
  if (chainId === FUJI.chainId) return;

  try {
    await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: FUJI.chainIdHex }] });
  } catch (error) {
    const code = errorCode(error);
    const unknownChain = code === 4902 || code === -32603;
    if (!unknownChain) throw new WalletError(walletErrorMessage(error));
    try {
      await p.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: FUJI.chainIdHex,
            chainName: FUJI.chainName,
            nativeCurrency: FUJI.nativeCurrency,
            rpcUrls: [FUJI.rpcUrl],
            blockExplorerUrls: [FUJI.explorer],
          },
        ],
      });
    } catch (addError) {
      throw new WalletError(walletErrorMessage(addError));
    }
  }

  const finalChain = await currentChainId(p);
  if (finalChain !== FUJI.chainId) {
    throw new WalletError('Hãy chuyển ví sang Avalanche Fuji (chainId 43113).');
  }
}

export async function connectWallet(): Promise<WalletSession> {
  const p = requireProvider();
  const list = await accounts(p, true);
  if (list.length === 0) throw new WalletError('Ví chưa có tài khoản nào được mở.');
  await ensureFuji(p);
  return { address: list[0], chainId: await currentChainId(p) };
}

/** Khôi phục phiên đã cấp quyền trước đó mà không bật popup. */
export async function restoreWallet(): Promise<WalletSession | null> {
  const p = provider();
  if (!p) return null;
  try {
    const list = await accounts(p, false);
    if (list.length === 0) return null;
    return { address: list[0], chainId: await currentChainId(p) };
  } catch {
    return null;
  }
}

export function watchWallet(handler: () => void): () => void {
  const p = provider();
  if (!p?.on) return () => undefined;
  const listener = (): void => handler();
  p.on('accountsChanged', listener);
  p.on('chainChanged', listener);
  return () => {
    p.removeListener?.('accountsChanged', listener);
    p.removeListener?.('chainChanged', listener);
  };
}

async function ethCall(p: Eip1193Provider, to: string, data: string): Promise<bigint> {
  if (!isAddress(to)) throw new WalletError('Địa chỉ contract không hợp lệ.');
  const result = await p.request({ method: 'eth_call', params: [{ to, data }, 'latest'] });
  if (typeof result !== 'string') throw new WalletError('Phản hồi eth_call không hợp lệ.');
  return decodeUint(result);
}

export async function readUsdcBalance(token: string, owner: string): Promise<bigint> {
  if (!isAddress(owner)) return 0n;
  return ethCall(requireProvider(), token, balanceOfData(owner));
}

export async function readAllowance(token: string, owner: string, spender: string): Promise<bigint> {
  return ethCall(requireProvider(), token, allowanceData(owner, spender));
}

export async function readPrizePool(vault: string): Promise<bigint> {
  return ethCall(requireProvider(), vault, SELECTOR.prizePool);
}

export async function readTotalPrincipal(vault: string): Promise<bigint> {
  return ethCall(requireProvider(), vault, SELECTOR.totalPrincipal);
}

export async function readSeasonEnd(vault: string): Promise<number> {
  const value = await ethCall(requireProvider(), vault, SELECTOR.seasonEnd);
  return Number(value);
}

export async function readPrincipal(vault: string, owner: string): Promise<bigint> {
  if (!isAddress(owner)) return 0n;
  return ethCall(requireProvider(), vault, principalOfData(owner));
}

async function sendTransaction(p: Eip1193Provider, from: string, to: string, data: string): Promise<string> {
  const hash = await p.request({ method: 'eth_sendTransaction', params: [{ from, to, data }] });
  if (typeof hash !== 'string' || !hash.startsWith('0x')) throw new WalletError('Ví không trả về mã giao dịch.');
  return hash;
}

interface Receipt {
  status?: unknown;
}

export async function waitForReceipt(
  p: Eip1193Provider,
  hash: string,
  timeoutMs = 120_000,
  pollMs = 1_500,
): Promise<{ success: boolean }> {
  const attempts = Math.ceil(timeoutMs / pollMs);
  for (let i = 0; i < attempts; i += 1) {
    const raw = await p.request({ method: 'eth_getTransactionReceipt', params: [hash] });
    if (typeof raw === 'object' && raw !== null) {
      const status = (raw as Receipt).status;
      return { success: status !== '0x0' };
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, pollMs);
    });
  }
  throw new WalletError('Chờ xác nhận giao dịch quá lâu. Kiểm tra Snowtrace.');
}

export type DepositStep = 'approve' | 'deposit' | 'done';

/** approve (nếu cần) rồi deposit 100 USDC vào SeasonVault. */
export async function approveAndDeposit(
  vault: string,
  token: string,
  amount: bigint,
  onStep: (step: DepositStep, txHash?: string) => void,
): Promise<{ approveTx: string | null; depositTx: string }> {
  if (!isAddress(vault) || !isAddress(token)) throw new WalletError('Contract chưa được cấu hình.');
  if (amount <= 0n) throw new WalletError('Số lượng nạp không hợp lệ.');

  const p = requireProvider();
  const list = await accounts(p, false);
  if (list.length === 0) throw new WalletError('Ví chưa kết nối.');
  await ensureFuji(p);
  const from = list[0];

  let approveTx: string | null = null;
  const allowance = await readAllowance(token, from, vault).catch(() => 0n);
  if (allowance < amount) {
    approveTx = await sendTransaction(p, from, token, approveData(vault, amount));
    onStep('approve', approveTx);
    const receipt = await waitForReceipt(p, approveTx);
    if (!receipt.success) throw new WalletError('Giao dịch approve thất bại trên chain.');
  }

  const depositTx = await sendTransaction(p, from, vault, depositData(amount));
  onStep('deposit', depositTx);
  const receipt = await waitForReceipt(p, depositTx);
  if (!receipt.success) throw new WalletError('Giao dịch nạp thất bại trên chain.');

  onStep('done', depositTx);
  return { approveTx, depositTx };
}
