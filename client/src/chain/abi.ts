/**
 * ABI tối thiểu cho MetaMask. Client không cần ethers — chỉ encode/decode
 * đúng vài hàm view + approve/deposit bằng calldata thủ công.
 */

export const FUJI = {
  chainId: 43113,
  chainIdHex: '0xa869',
  chainName: 'Avalanche Fuji',
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  explorer: 'https://testnet.snowtrace.io',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
} as const;

/** keccak256(signature).slice(0, 10) */
export const SELECTOR = {
  balanceOf: '0x70a08231', // balanceOf(address)
  allowance: '0xdd62ed3e', // allowance(address,address)
  approve: '0x095ea7b3', // approve(address,uint256)
  deposit: '0xb6b55f25', // deposit(uint256)
  prizePool: '0x719ce73e', // prizePool()
  totalPrincipal: '0x4b1533b2', // totalPrincipal()
  seasonEnd: '0xe757b20d', // seasonEnd()
  principalOf: '0x61e20a1c', // principalOf(address)
} as const;

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function isAddress(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_ADDRESS.test(value);
}

export function encodeAddress(address: string): string {
  if (!isAddress(address)) throw new Error('Địa chỉ ví không hợp lệ');
  return address.slice(2).toLowerCase().padStart(64, '0');
}

export function encodeUint(value: bigint): string {
  if (value < 0n) throw new Error('Giá trị uint không được âm');
  return value.toString(16).padStart(64, '0');
}

function encodeCall(selector: string, ...words: string[]): string {
  return `${selector}${words.join('')}`;
}

export function balanceOfData(owner: string): string {
  return encodeCall(SELECTOR.balanceOf, encodeAddress(owner));
}

export function allowanceData(owner: string, spender: string): string {
  return encodeCall(SELECTOR.allowance, encodeAddress(owner), encodeAddress(spender));
}

export function approveData(spender: string, amount: bigint): string {
  return encodeCall(SELECTOR.approve, encodeAddress(spender), encodeUint(amount));
}

export function depositData(amount: bigint): string {
  return encodeCall(SELECTOR.deposit, encodeUint(amount));
}

export function principalOfData(owner: string): string {
  return encodeCall(SELECTOR.principalOf, encodeAddress(owner));
}

/** Giải mã một word uint256 từ eth_call. */
export function decodeUint(data: string): bigint {
  if (typeof data !== 'string' || !data.startsWith('0x') || data.length < 3) return 0n;
  const body = data.slice(2, 66);
  if (body.length === 0) return 0n;
  return BigInt(`0x${body}`);
}

export function snowtraceTx(hash: string): string {
  return `${FUJI.explorer}/tx/${hash}`;
}

export function snowtraceAddress(address: string): string {
  return `${FUJI.explorer}/address/${address}`;
}
