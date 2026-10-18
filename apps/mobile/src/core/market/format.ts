import type { Ticker } from './types';

const MINUS = '−';

function withGrouping(fixed: string): string {
  const [integer, fraction] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Number of decimal places in a tick size string such as "0.01". */
export function decimalsOf(step: string): number {
  const [, fraction = ''] = step.split('.');
  return fraction.replace(/0+$/, '').length;
}

export function formatPrice(value: number | string, decimals: number): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return withGrouping(number.toFixed(decimals));
}

/** How many decimals to show for sizes: fewer for cheap coins, where one unit is a lot. */
export function sizeDecimals(price: number): number {
  if (price >= 10_000) return 5;
  if (price >= 100) return 4;
  if (price >= 1) return 2;
  return 0;
}

export function formatSize(value: number | string, decimals: number): string {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(decimals) : '—';
}

export function changePercent(ticker: Pick<Ticker, 'last' | 'open24h'>): number | null {
  const last = Number(ticker.last);
  const open = Number(ticker.open24h);
  return open > 0 && Number.isFinite(last) ? ((last - open) / open) * 100 : null;
}

/** "+2.14%" or "−1.08%" (a real minus sign, as in the design). */
export function formatChange(percent: number | null): string {
  if (percent === null) return '—';
  const text = Math.abs(percent).toFixed(2);
  return percent < 0 ? `${MINUS}${text}%` : `+${text}%`;
}

export function formatVolume(value: number | string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
  if (number >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
  if (number >= 1e3) return `${(number / 1e3).toFixed(2)}K`;
  return number.toFixed(2);
}

/** Local HH:MM:SS. */
export function formatTime(ts: number): string {
  const date = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Price grouping choices for the order book: the tick size and three steps above it. */
export function groupingOptions(tickSz: string): number[] {
  const tick = Number(tickSz);
  const decimals = decimalsOf(tickSz);
  return [0, 1, 2, 3].map((power) => Number((tick * 10 ** power).toFixed(Math.max(decimals, 0))));
}

/** Formats a grouping value without trailing noise, e.g. 0.1, 1, 10. */
export function formatGrouping(value: number): string {
  return String(value);
}
