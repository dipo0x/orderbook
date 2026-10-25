import { ed25519 } from '@noble/curves/ed25519.js';
import { base58, base64 } from '@scure/base';

/**
 * A Solana transaction is a list of signatures followed by a message. The message lists every
 * account involved (signers first, then by access level), a recent blockhash that makes the
 * transaction expire, and the instructions. Everything is length-prefixed with a "compact" integer.
 */

const SYSTEM_PROGRAM = new Uint8Array(32); // 11111111111111111111111111111111 is 32 zero bytes
const TRANSFER_INSTRUCTION = 2; // System Program: Transfer

/** Compact-u16: lengths under 128 take one byte, which covers everything this builder makes. */
function compact(length: number): number[] {
  if (length >= 128) throw new Error('Length too large for this simple encoder');
  return [length];
}

function u64LittleEndian(value: bigint): Uint8Array {
  if (value < 0n || value >= 1n << 64n) throw new Error('Amount does not fit in 64 bits');
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function concat(...parts: (Uint8Array | number[])[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** The message bytes for "send `lamports` from `from` to `to`", valid until the blockhash expires. */
export function buildTransferMessage(params: {
  from: Uint8Array;
  to: string;
  lamports: bigint;
  recentBlockhash: string;
}): Uint8Array {
  const to = base58.decode(params.to);
  if (to.length !== 32) throw new Error('Recipient is not a valid address');
  const blockhash = base58.decode(params.recentBlockhash);

  // Accounts in the order the rules require: signer+writable, writable, then read-only programs.
  const accountKeys = [params.from, to, SYSTEM_PROGRAM];
  const header = [
    1, // signatures required: the sender
    0, // read-only signed accounts
    1, // read-only unsigned accounts: the System Program
  ];

  const instructionData = concat([TRANSFER_INSTRUCTION, 0, 0, 0], u64LittleEndian(params.lamports));
  const instruction = concat(
    [2], // program: index 2 in accountKeys
    compact(2),
    [0, 1], // accounts: from, to
    compact(instructionData.length),
    instructionData,
  );

  return concat(
    header,
    compact(accountKeys.length),
    ...accountKeys,
    blockhash,
    compact(1),
    instruction,
  );
}

/** Signs the message and returns the signature plus the full transaction ready to send. */
export function signMessage(message: Uint8Array, privateKey: Uint8Array) {
  const signature = ed25519.sign(message, privateKey);
  const wire = concat(compact(1), signature, message);
  return { signature: base58.encode(signature), wireBase64: base64.encode(wire) };
}

/** The message base64-encoded, as `getFeeForMessage` expects it. */
export function messageBase64(message: Uint8Array): string {
  return base64.encode(message);
}

/** A transaction with an empty (all-zero) signature slot, for simulating before anything is signed. */
export function unsignedWireBase64(message: Uint8Array): string {
  return base64.encode(concat(compact(1), new Uint8Array(64), message));
}

/**
 * Signs a transaction someone else built (such as a Jupiter swap), given as base64. Before signing it
 * checks that this wallet is the only signer and the fee payer, so it can't be used to sign for a
 * different account. The transaction's own message bytes are what get signed.
 */
export function signSerializedTransaction(txBase64: string, privateKey: Uint8Array, publicKey: Uint8Array) {
  const bytes = base64.decode(txBase64);
  const signatureCount = bytes[0];
  if (signatureCount !== 1) throw new Error('This transaction needs signatures this wallet cannot give.');
  const message = bytes.slice(1 + 64 * signatureCount);

  const versionOffset = message[0] & 0x80 ? 1 : 0; // versioned messages start with a version byte
  if (message[versionOffset] !== 1) throw new Error('This transaction needs signatures this wallet cannot give.');
  let keyCountAt = versionOffset + 3; // after the 3-byte header
  let keyCount = message[keyCountAt];
  if (keyCount >= 128) {
    keyCount = (keyCount & 0x7f) | (message[keyCountAt + 1] << 7);
    keyCountAt += 1;
  }
  const payer = message.slice(keyCountAt + 1, keyCountAt + 33);
  if (payer.length !== 32 || payer.some((byte, i) => byte !== publicKey[i])) {
    throw new Error('This transaction was built for a different wallet.');
  }

  const signature = ed25519.sign(message, privateKey);
  return { signature: base58.encode(signature), wireBase64: base64.encode(concat([1], signature, message)) };
}
