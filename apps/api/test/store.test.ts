import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Store } from '../src/store.ts';
import { A, B, TOKEN_1, TOKEN_2, prefs } from './helpers.ts';

test('registers, updates and removes devices', () => {
  const store = new Store(':memory:');
  store.upsertDevice({ token: TOKEN_1, address: A, cluster: 'devnet', prefs });
  store.upsertDevice({ token: TOKEN_1, address: B, cluster: 'devnet', prefs: { ...prefs, incoming: false } });
  assert.equal(store.allDevices().length, 1);
  assert.equal(store.getDevice(TOKEN_1)?.address, B);
  assert.equal(store.getDevice(TOKEN_1)?.prefs.incoming, false);
  store.deleteDevice(TOKEN_1);
  assert.equal(store.getDevice(TOKEN_1), null);
});

test('finds the phones for one wallet on one network', () => {
  const store = new Store(':memory:');
  store.upsertDevice({ token: TOKEN_1, address: A, cluster: 'devnet', prefs });
  store.upsertDevice({ token: TOKEN_2, address: A, cluster: 'mainnet-beta', prefs });
  assert.deepEqual(store.devicesForWallet('devnet', A).map((d) => d.token), [TOKEN_1]);
  assert.equal(store.watchedWallets().length, 2);
});

test('cursors are kept per wallet and pruned when nobody watches', () => {
  const store = new Store(':memory:');
  store.upsertDevice({ token: TOKEN_1, address: A, cluster: 'devnet', prefs });
  assert.equal(store.getCursor('devnet', A), null);
  store.setCursor('devnet', A, 'sig1');
  store.setCursor('devnet', A, 'sig2');
  assert.equal(store.getCursor('devnet', A), 'sig2');
  store.deleteDevice(TOKEN_1);
  store.pruneCursors();
  assert.equal(store.getCursor('devnet', A), null);
});
