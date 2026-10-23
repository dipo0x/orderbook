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
