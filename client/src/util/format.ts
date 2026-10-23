const USDC_DECIMALS = 6n;
const USDC_SCALE = 10n ** USDC_DECIMALS;

/** 1800 -> "1,800" (deterministic, không phụ thuộc locale máy). */
export function formatInt(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Bigint USDC (6 decimals) -> "1,234.50". */
export function formatUsdc(value: bigint | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '—';
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / USDC_SCALE;
  const fraction = (abs % USDC_SCALE).toString().padStart(6, '0').slice(0, digits);
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${wholeText}${digits > 0 ? `.${fraction}` : ''}`;
}

/** "100" / 100 -> 100_000_000n. Không dùng float để tránh sai số. */
export function parseUsdc(amount: string | number): bigint {
  const text = typeof amount === 'number' ? amount.toFixed(6) : amount.trim();
  const [whole = '0', fraction = ''] = text.split('.');
  const normalizedWhole = whole === '' ? '0' : whole;
  const normalizedFraction = fraction.padEnd(6, '0').slice(0, 6);
  return BigInt(normalizedWhole) * USDC_SCALE + BigInt(normalizedFraction || '0');
}

export function shortAddress(address: string | null | undefined): string {
  if (!address) return '—';
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** giây -> "2d 04h" | "03:12:40" | "12:40". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  if (days > 0) return `${days}d ${hours.toString().padStart(2, '0')}h`;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`;
}
