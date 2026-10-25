const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Decodes a base58 string to bytes, or null if it contains a character outside the alphabet. */
export function base58Decode(text: string): Uint8Array | null {
  let value = 0n;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    value = value * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  for (const char of text) {
    if (char !== '1') break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

/** A Solana address is 32 bytes in base58. This checks the shape, not whether the account exists. */
export function isSolanaAddress(text: unknown): text is string {
  if (typeof text !== 'string' || text.length < 32 || text.length > 44) return false;
  return base58Decode(text)?.length === 32;
}
