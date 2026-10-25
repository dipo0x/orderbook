import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PushMessage } from '../src/push.ts';
import { Store } from '../src/store.ts';
import { analyzeTransaction, createWatcher, formatSol, notificationsFor } from '../src/watcher.ts';
import { A, B, C, TOKEN_1, TOKEN_2, prefs } from './helpers.ts';

const SOL = 1_000_000_000;

/** A parsed transaction where balances moved as listed: [address, before, after], fee payer first. */
function tx(moves: [string, number, number][], fee = 5000, err: unknown = null) {
  return {
    meta: { err, fee, preBalances: moves.map((m) => m[1]), postBalances: moves.map((m) => m[2]) },
    transaction: { message: { accountKeys: moves.map((m) => ({ pubkey: m[0] })) } },
  };
}

test('formats SOL without float rounding', () => {
  assert.equal(formatSol(1_500_000_000n), '1.5');
  assert.equal(formatSol(100_000_000n), '0.1');
  assert.equal(formatSol(1n), '0');
  assert.equal(formatSol(-12_345_678_901n), '12.3456');
});

test('incoming transfer: positive, counterparty is the sender', () => {
  const effect = analyzeTransaction(B, 'sig', tx([[A, 5 * SOL, 4 * SOL - 5000], [B, 0, SOL]]))!;
  assert.equal(effect.netLamports, BigInt(SOL));
  assert.equal(effect.counterparty, A);
});

test('outgoing transfer: the fee is not counted as the amount sent', () => {
  const effect = analyzeTransaction(A, 'sig', tx([[A, 5 * SOL, 4 * SOL - 5000], [B, 0, SOL]]))!;
  assert.equal(effect.netLamports, -BigInt(SOL));
  assert.equal(effect.counterparty, B);
});

test('a transaction that does not involve the wallet is ignored', () => {
  assert.equal(analyzeTransaction(C, 'sig', tx([[A, 5, 4], [B, 0, 1]])), null);
});

test('notifications respect each phone\'s preferences', () => {
  const incoming = analyzeTransaction(B, 'sig', tx([[A, 5 * SOL, 4 * SOL - 5000], [B, 0, SOL]]))!;
  const devices = [
    { token: TOKEN_1, address: B, cluster: 'devnet' as const, prefs },
    { token: TOKEN_2, address: B, cluster: 'devnet' as const, prefs: { ...prefs, incoming: false } },
  ];
  const messages = notificationsFor(incoming, B, devices, 10);
  assert.deepEqual(messages.map((m) => m.to), [TOKEN_1]);
  assert.match(messages[0].title, /Received 1 SOL/);
});

test('a confirmed send notifies, and a large one also raises the large-transfer alert', () => {
  const small = analyzeTransaction(A, 's1', tx([[A, 50 * SOL, 49 * SOL - 5000], [B, 0, SOL]]))!;
  const large = analyzeTransaction(A, 's2', tx([[A, 50 * SOL, 38 * SOL - 5000], [B, 0, 12 * SOL]]))!;
  const device = [{ token: TOKEN_1, address: A, cluster: 'devnet' as const, prefs }];
  assert.equal(notificationsFor(small, A, device, 10).length, 1);
  const titles = notificationsFor(large, A, device, 10).map((m) => m.title);
  assert.deepEqual(titles, ['Sent 12 SOL', 'Large transfer']);
});

test('a failed transaction is reported once, as a failure', () => {
  const failed = analyzeTransaction(A, 'sig', tx([[A, SOL, SOL - 5000], [B, 0, 0]], 5000, { InstructionError: [0, 'x'] }))!;
  const messages = notificationsFor(failed, A, [{ token: TOKEN_1, address: A, cluster: 'devnet', prefs }], 10);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].title, 'Transaction failed');
});

/** Builds a watcher over a fake chain whose history for `A` we control. */
function setup(history: () => { signature: string; err: unknown }[], txs: Record<string, ReturnType<typeof tx> | null>) {
  const store = new Store(':memory:');
  store.upsertDevice({ token: TOKEN_1, address: A, cluster: 'devnet', prefs });
  const sent: PushMessage[] = [];
  const watcher = createWatcher({
    store,
    rpc: (async (_c: string, method: string, params: unknown[]) => {
      if (method === 'getTransaction') return txs[params[0] as string] ?? null;
      const options = params[1] as { until?: string; limit: number };
      const all = history();
      const stop = options.until ? all.findIndex((s) => s.signature === options.until) : -1;
      return (stop >= 0 ? all.slice(0, stop) : all).slice(0, options.limit);
    }) as never,
    push: async (messages) => void sent.push(...messages),
    prices: { tickers: async () => ({ data: [{ last: '100' }] }) } as never,
    largeTransferSol: 10,
    priceAlertPercent: 5,
  });
  return { store, sent, watcher };
}

test('the first pass only records where history ends, so old activity never notifies', async () => {
  const { watcher, sent, store } = setup(() => [{ signature: 'old', err: null }], {});
  await watcher.tick();
  assert.equal(sent.length, 0);
  assert.equal(store.getCursor('devnet', A), 'old');
});

test('new transactions notify once, oldest first, and are not repeated', async () => {
  let history = [{ signature: 'old', err: null }];
  const txs = {
    t1: tx([[B, 5 * SOL, 4 * SOL - 5000], [A, 0, SOL]]),
    t2: tx([[C, 5 * SOL, 3 * SOL - 5000], [A, 0, 2 * SOL]]),
  };
  const { watcher, sent } = setup(() => history, txs);
  await watcher.tick();
  history = [{ signature: 't2', err: null }, { signature: 't1', err: null }, ...history];
  await watcher.tick();
  assert.deepEqual(sent.map((m) => m.title), ['Received 1 SOL', 'Received 2 SOL']);
  await watcher.tick();
  assert.equal(sent.length, 2);
});

test('a transaction the node cannot read yet is retried, not skipped', async () => {
  let history = [{ signature: 'old', err: null }];
  const txs: Record<string, ReturnType<typeof tx> | null> = { t1: null };
  const { watcher, sent } = setup(() => history, txs);
  await watcher.tick();
  history = [{ signature: 't1', err: null }, ...history];
  await watcher.tick();
  assert.equal(sent.length, 0);
  txs.t1 = tx([[B, 5 * SOL, 4 * SOL - 5000], [A, 0, SOL]]);
  await watcher.tick();
  assert.equal(sent.length, 1);
});

test('a wallet with no history at all still gets its first transaction', async () => {
  let history: { signature: string; err: unknown }[] = [];
  const { watcher, sent } = setup(() => history, { t1: tx([[B, 5 * SOL, 4 * SOL - 5000], [A, 0, SOL]]) });
  await watcher.tick();
  history = [{ signature: 't1', err: null }];
  await watcher.tick();
  assert.equal(sent.length, 1);
});

test('price alerts fire on a big move, only once per cooldown, and only for opted-in phones', async () => {
  let time = 0;
  let price = 100;
  const store = new Store(':memory:');
  store.upsertDevice({ token: TOKEN_1, address: A, cluster: 'devnet', prefs });
  store.upsertDevice({ token: TOKEN_2, address: B, cluster: 'devnet', prefs: { ...prefs, priceAlerts: false } });
  const sent: PushMessage[] = [];
  const watcher = createWatcher({
    store,
    rpc: (async () => []) as never,
    push: async (messages) => void sent.push(...messages),
    prices: { tickers: async () => ({ data: [{ last: String(price) }] }) } as never,
    largeTransferSol: 10,
    priceAlertPercent: 5,
    now: () => time,
  });
  await watcher.priceTick(); // sets the reference
  price = 103;
  await watcher.priceTick();
  assert.equal(sent.length, 0); // 3% is not enough
  price = 108;
  await watcher.priceTick();
  assert.deepEqual(sent.map((m) => m.to), [TOKEN_1]);
  assert.match(sent[0].title, /SOL up 8\.0%/);
  price = 120;
  time += 60_000;
  await watcher.priceTick();
  assert.equal(sent.length, 1); // cooldown
});
