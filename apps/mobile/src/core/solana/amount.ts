export const LAMPORTS_PER_SOL = 1_000_000_000n;
const SOL_DECIMALS = 9;

/**
 * Parses what a person typed ("12.5") into lamports, exactly. No floating point is involved, so
 * 0.1 + 0.2 style rounding can never change an amount of money. Returns null for anything that
 * isn't a plain decimal number or has more than 9 decimal places.
 */
export function parseSolToLamports(text: string): bigint | null {
  if (!/^\d*\.?\d*$/.test(text) || text === '' || text === '.') return null;
  const [whole = '0', fraction = ''] = text.split('.');
  if (fraction.length > SOL_DECIMALS) return null;
  return BigInt(whole || '0') * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(SOL_DECIMALS, '0') || '0');
}

/** Formats lamports as SOL with a fixed number of decimals (truncating, never rounding up). */
export function formatLamports(lamports: bigint, decimals = 4): string {
  const negative = lamports < 0n;
  const value = negative ? -lamports : lamports;
  const whole = value / LAMPORTS_PER_SOL;
  const fraction = (value % LAMPORTS_PER_SOL).toString().padStart(SOL_DECIMALS, '0');
  const shown = decimals > 0 ? `${whole}.${fraction.slice(0, decimals)}` : String(whole);
  return `${negative ? '-' : ''}${shown}`;
}

/** Like formatLamports, but keeps every non-zero digit (e.g. 12.500005, 0.000005). */
export function formatLamportsExact(lamports: bigint): string {
  const text = formatLamports(lamports, SOL_DECIMALS).replace(/0+$/, '');
  return text.endsWith('.') ? text.slice(0, -1) : text;
}
