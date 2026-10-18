import { ed25519 } from '@noble/curves/ed25519.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { base58 } from '@scure/base';
import { mnemonicToSeed } from '@scure/bip39';

import { normalizeMnemonic } from './mnemonic';

/** Default Solana path used by Phantom and most wallets. */
export const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

const HARDENED = 0x80000000;
const ED25519_SEED_KEY = Uint8Array.from('ed25519 seed', (char) => char.charCodeAt(0));

export type SolanaAccount = {
  address: string;
  publicKey: Uint8Array;
  /** 32-byte ed25519 seed. Keep in memory only as long as needed; never persist or log it. */
  privateKey: Uint8Array;
};

function parsePath(path: string): number[] {
  const parts = path.split('/');
  if (parts[0] !== 'm') throw new Error(`Invalid derivation path: ${path}`);

  return parts.slice(1).map((part) => {
    // SLIP-0010 ed25519 supports hardened derivation only.
    if (!/^\d+'$/.test(part)) throw new Error(`Path segments must be hardened: ${path}`);
    const index = Number(part.slice(0, -1));
    if (!Number.isSafeInteger(index) || index >= HARDENED) throw new Error(`Invalid index: ${path}`);
    return index + HARDENED;
  });
}

/** SLIP-0010 ed25519 key derivation. */
function derivePrivateKey(seed: Uint8Array, path: string): Uint8Array {
  let node = hmac(sha512, ED25519_SEED_KEY, seed);
  let key = node.slice(0, 32);
  let chainCode = node.slice(32);

  for (const index of parsePath(path)) {
    const data = new Uint8Array(37);
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, index, false);
    node = hmac(sha512, chainCode, data);
    key = node.slice(0, 32);
    chainCode = node.slice(32);
  }
  return key;
}

export async function deriveSolanaAccount(
  mnemonic: string,
  path: string = SOLANA_DERIVATION_PATH,
): Promise<SolanaAccount> {
  const seed = await mnemonicToSeed(normalizeMnemonic(mnemonic));
  const privateKey = derivePrivateKey(seed, path);
  const publicKey = ed25519.getPublicKey(privateKey);
  return { address: base58.encode(publicKey), publicKey, privateKey };
}
