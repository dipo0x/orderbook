import type { ParsedActivity } from '@/core/solana/rpc';

export type ActivityKind = 'sent' | 'received';

export const kindOf = (item: ParsedActivity): ActivityKind => (item.lamportDelta > 0n ? 'received' : 'sent');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "14:32" in the phone's timezone. */
export function clock(seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "17 Oct 2026, 15:03". */
export function fullDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${clock(seconds)}`;
}

/** Section heading: TODAY, YESTERDAY, or "17 OCTOBER"-style. */
export function dayHeading(seconds: number | null, now: Date): string {
  if (seconds === null) return 'PENDING';
  const date = new Date(seconds * 1000);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (daysAgo <= 0) return 'TODAY';
  if (daysAgo === 1) return 'YESTERDAY';
  return `${date.getDate()} ${MONTHS[date.getMonth()].toUpperCase()}`;
}
