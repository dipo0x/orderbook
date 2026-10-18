import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export const WORDLIST = wordlist;

/** 128 bits of entropy gives a 12-word phrase. Callers supply entropy from a secure source. */
export function mnemonicFromEntropy(entropy: Uint8Array): string {
  if (entropy.length !== 16) throw new Error('Expected 16 bytes of entropy');
  return entropyToMnemonic(entropy, wordlist);
}

/** Lowercase, trim and collapse whitespace so pasted phrases compare cleanly. */
export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

export function wordCount(input: string): number {
  const normalized = normalizeMnemonic(input);
  return normalized === '' ? 0 : normalized.split(' ').length;
}

/** True for a 12 or 24 word phrase with a valid BIP-39 checksum. */
export function isValidMnemonic(input: string): boolean {
  const count = wordCount(input);
  if (count !== 12 && count !== 24) return false;
  return validateMnemonic(normalizeMnemonic(input), wordlist);
}
