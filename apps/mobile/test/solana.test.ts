/// <reference types="node" />
import { base58, base64 } from '@scure/base';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { findLookalike, isValidAddress } from '../src/core/solana/address';
import { formatLamports, formatLamportsExact, formatUnits, parseSolToLamports, parseUnits } from '../src/core/solana/amount';
import { describeSimulationError } from '../src/core/solana/errors';
import { buildTransferMessage, signMessage, signSerializedTransaction } from '../src/core/solana/transaction';

const blockhash = () => base58.encode(new Uint8Array(randomBytes(32)));

test('a transfer is byte-identical to the one @solana/web3.js builds, for edge amounts too', () => {
  const sender = Keypair.generate();
  const to = Keypair.generate().publicKey;
  for (const lamports of [1n, 5000n, 100_000_000n, 18_446_744_073_709_551_615n]) {
    const hash = blockhash();
    const mine = buildTransferMessage({ from: sender.publicKey.toBytes(), to: to.toBase58(), lamports, recentBlockhash: hash });
    const tx = new Transaction({ feePayer: sender.publicKey, recentBlockhash: hash }).add(
      SystemProgram.transfer({ fromPubkey: sender.publicKey, toPubkey: to, lamports }),
    );
    assert.deepEqual(Buffer.from(mine), tx.serializeMessage(), `${lamports} lamports`);

    const signed = signMessage(mine, sender.secretKey.slice(0, 32));
    tx.sign(sender);
    assert.equal(signed.wireBase64, tx.serialize().toString('base64'));
    assert.equal(signed.signature, base58.encode(tx.signature!));
    assert.ok(tx.verifySignatures());
  }
});

test('transfer input is validated', () => {
  const from = Keypair.generate().publicKey.toBytes();
  const to = Keypair.generate().publicKey.toBase58();
  assert.throws(() => buildTransferMessage({ from, to, lamports: 1n << 64n, recentBlockhash: blockhash() }), /64 bits/);
  assert.throws(() => buildTransferMessage({ from, to: base58.encode(new Uint8Array(31).fill(1)), lamports: 1n, recentBlockhash: blockhash() }));
});

/** A swap-shaped transaction: version 0, one signer, built by web3.js the way Jupiter builds theirs. */
function unsignedVersioned(payer: PublicKey) {
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash(),
    instructions: [SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1000 })],
  }).compileToV0Message();
  return base64.encode(new VersionedTransaction(message).serialize());
}

test('signing a third-party (swap) transaction produces a valid signature and changes nothing else', () => {
  const user = Keypair.generate();
  const unsigned = unsignedVersioned(user.publicKey);
  const signed = signSerializedTransaction(unsigned, user.secretKey.slice(0, 32), user.publicKey.toBytes());
  const before = VersionedTransaction.deserialize(base64.decode(unsigned));
  const after = VersionedTransaction.deserialize(base64.decode(signed.wireBase64));
  assert.deepEqual(Buffer.from(after.message.serialize()), Buffer.from(before.message.serialize()));
  assert.ok(ed25519.verify(after.signatures[0], after.message.serialize(), user.publicKey.toBytes()));
});

test('it refuses to sign a transaction paid for by a different wallet', () => {
  const user = Keypair.generate();
  const someoneElse = Keypair.generate();
  const unsigned = unsignedVersioned(someoneElse.publicKey);
  assert.throws(() => signSerializedTransaction(unsigned, user.secretKey.slice(0, 32), user.publicKey.toBytes()), /different wallet/);
});

test('SOL amounts are exact, with no floating point', () => {
  const cases: [string, bigint | null][] = [
    ['0.1', 100_000_000n], ['1', 1_000_000_000n], ['1.', 1_000_000_000n], ['.5', 500_000_000n], ['0.000000001', 1n],
    ['0', 0n], ['1.1234567891', null], ['', null], ['.', null], ['-1', null], ['1e3', null], ['1,5', null], ['abc', null],
  ];
  for (const [text, want] of cases) assert.equal(parseSolToLamports(text), want, `"${text}"`);
  assert.equal(parseSolToLamports('0.1')! + parseSolToLamports('0.2')!, parseSolToLamports('0.3'));
  assert.equal(formatLamports(1_999_999_999n, 4), '1.9999', 'truncates, never rounds up');
  assert.equal(formatLamportsExact(5000n), '0.000005');
  assert.equal(formatLamportsExact(12_500_005_000n), '12.500005');
});

test('token amounts use each token\'s own decimals', () => {
  assert.equal(parseUnits('12.345678', 6), 12_345_678n);
  assert.equal(parseUnits('1.1234567', 6), null);
  assert.equal(formatUnits(12_345_600n, 6, 4), '12.3456');
  assert.equal(formatUnits(1_000_000n, 6), '1');
});

test('address checks', () => {
  assert.ok(isValidAddress('Hc6g9Q23hQe3Ej4kiqujcrRpyzghofpFj9ZojnUau2Gp'));
  for (const bad of ['', 'Hc6g9Q23', '0xdeadbeef']) assert.ok(!isValidAddress(bad), bad);
});

test('address poisoning: a lookalike of a known address is caught', () => {
  const real = 'Hc6g9Q23hQe3Ej4kiqujcrRpyzghofpFj9ZojnUau2Gp';
  const fake = 'Hc6gZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZu2Gp';
  assert.equal(findLookalike(fake, [real]), real);
  assert.equal(findLookalike(real, [real]), null, 'the same address is not a lookalike of itself');
  assert.equal(findLookalike('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', [real]), null);
});

test('simulation failures become messages a person can act on', () => {
  assert.match(describeSimulationError('AccountNotFound', null), /faucet/);
  assert.match(describeSimulationError({ InstructionError: [0, { Custom: 1 }] }, null), /Not enough SOL/);
  assert.match(describeSimulationError({ InstructionError: [0, 'X'] }, ['boom']), /boom/);
});
