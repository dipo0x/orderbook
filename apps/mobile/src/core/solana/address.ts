import { base58 } from '@scure/base';

/** A Solana address is a 32-byte public key written in base58. */
export function isValidAddress(text: string): boolean {
  try {
    return base58.decode(text.trim()).length === 32;
  } catch {
    return false;
  }
}

export function shortAddress(address: string, edge = 4): string {
  return address.length <= edge * 2 + 1 ? address : `${address.slice(0, edge)}…${address.slice(-edge)}`;
}

/**
 * Address-poisoning check. Scammers send a tiny transfer from an address that starts and ends like one
 * you use, hoping you copy it from your history. Returns the real address this one imitates, if any.
 */
export function findLookalike(address: string, known: string[], edge = 4): string | null {
  const head = address.slice(0, edge);
  const tail = address.slice(-edge);
  return known.find((other) => other !== address && other.startsWith(head) && other.endsWith(tail)) ?? null;
}
