import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assessRecipient, parseFlaggedList } from '../src/risk.ts';
import { A, B, C } from './helpers.ts';

/** A fake node: `used` addresses have a balance and history, everything else is empty. */
const node = (used: string[], down = false) =>
  (async (_cluster: string, method: string, params: unknown[]) => {
    if (down) throw new Error('offline');
    const isUsed = used.includes(params[0] as string);
    if (method === 'getBalance') return { value: isUsed ? 1000 : 0 };
    return isUsed ? [{ signature: 's' }] : [];
  }) as never;

const base = { cluster: 'devnet', owner: A } as const;

test('a used address is fine', async () => {
  const result = await assessRecipient({ ...base, recipient: B }, { rpc: node([B]), flagged: new Map() });
  assert.deepEqual(result, { level: 'ok', reasons: [] });
});

test('an address nobody has used gets a warning', async () => {
  const result = await assessRecipient({ ...base, recipient: C }, { rpc: node([]), flagged: new Map() });
  assert.equal(result.level, 'warn');
  assert.equal(result.reasons[0].code, 'never_used');
});

test('an invalid address is blocked', async () => {
  const result = await assessRecipient({ ...base, recipient: 'not-an-address' }, { rpc: node([]), flagged: new Map() });
  assert.equal(result.level, 'block');
  assert.equal(result.reasons[0].code, 'invalid_address');
});

test('a flagged address is blocked with the reason', async () => {
  const flagged = new Map([[B, 'Drainer']]);
  const result = await assessRecipient({ ...base, recipient: B }, { rpc: node([B]), flagged });
  assert.equal(result.level, 'block');
  assert.match(result.reasons[0].message, /Drainer/);
});

test('sending to yourself is a warning', async () => {
  const result = await assessRecipient({ ...base, recipient: A }, { rpc: node([A]), flagged: new Map() });
  assert.equal(result.level, 'warn');
  assert.equal(result.reasons[0].code, 'self_transfer');
});

test('an unreachable node never blocks a transfer', async () => {
  const result = await assessRecipient({ ...base, recipient: B }, { rpc: node([], true), flagged: new Map() });
  assert.equal(result.level, 'ok');
});

test('the flagged list ignores bad rows and bad files', () => {
  assert.equal(parseFlaggedList('[]').size, 0);
  assert.equal(parseFlaggedList('not json').size, 0);
  const list = parseFlaggedList(JSON.stringify([{ address: B, reason: 'x' }, { address: 'bad' }, { reason: 'no address' }]));
  assert.deepEqual([...list.keys()], [B]);
});
