/// <reference types="node" />
import { ed25519 } from '@noble/curves/ed25519.js';
import { base58 } from '@scure/base';
import { Keypair } from '@solana/web3.js';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { deriveSolanaAccount } from '../src/core/wallet/derive';
import { isValidMnemonic, mnemonicFromEntropy, normalizeMnemonic } from '../src/core/wallet/mnemonic';
import { isWeakPin, unwrapWithPin, wrapWithPin } from '../src/core/wallet/pin-crypto';

const ABANDON = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const random = async (n: number) => new Uint8Array(randomBytes(n));

test('the standard test phrase gives the address Phantom gives', async () => {
  const account = await deriveSolanaAccount(ABANDON);
  assert.equal(account.address, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
});

test('the same phrase always gives the same address (the restore-after-reinstall guarantee)', async () => {
  const a = await deriveSolanaAccount(ABANDON);
  const b = await deriveSolanaAccount(`  ${ABANDON.toUpperCase()}  `);
  assert.equal(a.address, b.address);
  const other = await deriveSolanaAccount(ABANDON.replace('about', 'zoo'));
  assert.notEqual(other.address, a.address);
});

test('derived keys agree with @solana/web3.js, and the exported key format imports there', async () => {
  const account = await deriveSolanaAccount(ABANDON);
  assert.equal(Keypair.fromSeed(account.privateKey).publicKey.toBase58(), account.address);
  const exported = new Uint8Array(64);
  exported.set(account.privateKey, 0);
  exported.set(account.publicKey, 32);
  assert.equal(Keypair.fromSecretKey(base58.decode(base58.encode(exported))).publicKey.toBase58(), account.address);
  assert.ok(ed25519.verify(ed25519.sign(new Uint8Array([1, 2, 3]), account.privateKey), new Uint8Array([1, 2, 3]), account.publicKey));
});

test('published BIP-39 vectors', () => {
  assert.equal(mnemonicFromEntropy(new Uint8Array(16)), ABANDON);
  assert.equal(
    mnemonicFromEntropy(new Uint8Array(16).fill(0x7f)),
    'legal winner thank year wave sausage worth useful legal winner thank yellow',
  );
  assert.equal(mnemonicFromEntropy(new Uint8Array(16).fill(0xff)), 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong');
});

test('phrase validation', () => {
  assert.ok(isValidMnemonic(ABANDON));
  assert.ok(!isValidMnemonic(ABANDON.replace('about', 'abandon')), 'bad checksum');
  assert.ok(!isValidMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'), '11 words');
  assert.ok(!isValidMnemonic(ABANDON.replace('about', 'bogus')), 'unknown word');
  assert.equal(normalizeMnemonic('  A   b\n c '), 'a b c');
});

test('PIN encryption: right PIN opens, wrong PIN and tampering do not', async () => {
  const wrapped = await wrapWithPin(ABANDON, '482913', random);
  assert.equal(await unwrapWithPin(wrapped, '482913'), ABANDON);
  assert.equal(await unwrapWithPin(wrapped, '482914'), null);
  const flipped = wrapped.ciphertext.slice(0, -2) + (wrapped.ciphertext.endsWith('00') ? '01' : '00');
  assert.equal(await unwrapWithPin({ ...wrapped, ciphertext: flipped }, '482913'), null);
});

test('every wrap uses a fresh salt and nonce, and never contains the phrase', async () => {
  const a = await wrapWithPin(ABANDON, '482913', random);
  const b = await wrapWithPin(ABANDON, '482913', random);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.nonce, b.nonce);
  assert.ok(!a.ciphertext.includes(Buffer.from('abandon').toString('hex')));
});

test('easy-to-guess PINs are rejected', () => {
  for (const pin of ['111111', '123456', '654321', '121212', '123123', '12345', 'abcdef']) assert.ok(isWeakPin(pin), pin);
  for (const pin of ['482913', '907316']) assert.ok(!isWeakPin(pin), pin);
});
