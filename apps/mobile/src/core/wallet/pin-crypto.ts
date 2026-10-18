import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hex } from '@scure/base';

/**
 * Cost of stretching the PIN. A 6-digit PIN can't survive offline guessing whatever this is set to,
 * so the real protection is the device keychain plus attempt limits. Stored with each wrapped secret
 * so it can be raised later without breaking existing wallets.
 */
export const PIN_KDF_ITERATIONS = 50_000;
export const PIN_LENGTH = 6;

export type WrappedSecret = {
  v: 1;
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

export type RandomBytes = (length: number) => Promise<Uint8Array>;

const toBytes = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const fromBytes = (bytes: Uint8Array) => Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

function deriveKey(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return pbkdf2Async(sha256, toBytes(pin), salt, { c: iterations, dkLen: 32 });
}

/** Encrypts an ASCII secret (a recovery phrase) with a key derived from the PIN. */
export async function wrapWithPin(
  secret: string,
  pin: string,
  randomBytes: RandomBytes,
): Promise<WrappedSecret> {
  const salt = await randomBytes(16);
  const nonce = await randomBytes(12);
  const key = await deriveKey(pin, salt, PIN_KDF_ITERATIONS);
  const ciphertext = gcm(key, nonce).encrypt(toBytes(secret));
  key.fill(0);
  return {
    v: 1,
    iterations: PIN_KDF_ITERATIONS,
    salt: hex.encode(salt),
    nonce: hex.encode(nonce),
    ciphertext: hex.encode(ciphertext),
  };
}

/** Returns the secret, or null if the PIN is wrong (AES-GCM fails its authentication check). */
export async function unwrapWithPin(wrapped: WrappedSecret, pin: string): Promise<string | null> {
  const key = await deriveKey(pin, hex.decode(wrapped.salt), wrapped.iterations);
  try {
    const plain = gcm(key, hex.decode(wrapped.nonce)).decrypt(hex.decode(wrapped.ciphertext));
    return fromBytes(plain);
  } catch {
    return null;
  } finally {
    key.fill(0);
  }
}

/** Rejects PINs that are trivial to guess: repeats, runs, and short repeating patterns. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d+$/.test(pin) || pin.length !== PIN_LENGTH) return true;
  const digits = [...pin].map(Number);

  if (digits.every((d) => d === digits[0])) return true;

  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return true;

  for (const period of [2, 3]) {
    if (digits.every((d, i) => d === digits[i % period])) return true;
  }
  return false;
}
