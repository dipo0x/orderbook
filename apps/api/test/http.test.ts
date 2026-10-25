import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import { createApp } from '../src/app.ts';
import { createPriceService } from '../src/prices.ts';
import type { PushMessage } from '../src/push.ts';
import { createRpcClient } from '../src/rpc-proxy.ts';
import { Store } from '../src/store.ts';
import { A, B, TOKEN_1, TOKEN_2, config, fakeFetch, prefs } from './helpers.ts';

const nodeCalls: { url: string; body: { method: string } }[] = [];
const pushed: PushMessage[] = [];
let base = '';
let server: ReturnType<typeof createServer>;

before(async () => {
  const upstreamFetch = fakeFetch((url, init) => {
    const body = JSON.parse(String(init?.body));
    nodeCalls.push({ url, body });
    if (body.method === 'getBalance') return { jsonrpc: '2.0', id: body.id, result: { value: body.params[0] === A ? 7 : 0 } };
    return { jsonrpc: '2.0', id: body.id, result: [] };
  });
  const upstream = { urls: config.upstream, fetch: upstreamFetch, timeoutMs: 1000 };
  const marketFetch = fakeFetch((url) =>
    url.includes('okx')
      ? { code: '0', data: [{ instId: 'BTC-USDT', last: '1' }, { instId: 'SOL-USDT', last: '2' }] }
      : { rates: { NGN: 1500, EUR: 0.9, GBP: 0.8, JPY: 150 } },
  );
  server = createServer(
    createApp({
      config,
      upstream,
      rpc: createRpcClient(upstream),
      store: new Store(':memory:'),
      push: async (messages) => void pushed.push(...messages),
      prices: createPriceService({ fetch: marketFetch }),
      flagged: new Map(),
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (path: string, body: unknown, method = 'POST') =>
  fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('health, unknown paths and wrong methods', async () => {
  assert.deepEqual(await (await fetch(base + '/health')).json(), { ok: true });
  assert.equal((await fetch(base + '/nope')).status, 404);
  assert.equal((await fetch(base + '/rpc/devnet')).status, 405);
});

test('the RPC proxy forwards to the right network', async () => {
  const response = await post('/rpc/mainnet-beta', { jsonrpc: '2.0', id: 9, method: 'getBalance', params: [A] });
  assert.deepEqual(await response.json(), { jsonrpc: '2.0', id: 9, result: { value: 7 } });
  assert.equal(nodeCalls.at(-1)?.url, 'http://main');
});

test('the RPC proxy refuses what it should', async () => {
  assert.equal((await post('/rpc/moonnet', { method: 'getBalance' })).status, 400);
  assert.equal((await post('/rpc/devnet', { jsonrpc: '2.0', id: 1, method: 'getProgramAccounts', params: [] })).status, 403);
  assert.equal((await post('/rpc/devnet', [{ method: 'getBalance' }])).status, 400);
  const bad = await fetch(base + '/rpc/devnet', { method: 'POST', body: '{nope' });
  assert.equal(bad.status, 400);
  assert.equal((await post('/rpc/devnet', { method: 'getBalance', pad: 'x'.repeat(70_000) })).status, 413);
});

test('prices are filtered and rates are limited to the supported currencies', async () => {
  const prices = (await (await fetch(base + '/prices?ids=SOL-USDT')).json()) as { data: { instId: string }[] };
  assert.deepEqual(prices.data.map((row) => row.instId), ['SOL-USDT']);
  const fx = (await (await fetch(base + '/fx')).json()) as { rates: Record<string, number> };
  assert.deepEqual(Object.keys(fx.rates).sort(), ['EUR', 'GBP', 'NGN']);
});

test('risk check answers over HTTP', async () => {
  const result = (await (await post('/risk/check', { cluster: 'devnet', owner: A, recipient: B })).json()) as { level: string; reasons: { code: string }[] };
  assert.equal(result.level, 'warn'); // the fake node says nobody has used it
  assert.equal(result.reasons[0].code, 'never_used');
  assert.equal((await post('/risk/check', { cluster: 'x', owner: A, recipient: B })).status, 400);
});

test('device registration validates input and warns existing phones about a new one', async () => {
  const good = { token: TOKEN_1, address: A, cluster: 'devnet', prefs };
  assert.equal((await post('/devices', { ...good, token: 'nope' })).status, 400);
  assert.equal((await post('/devices', { ...good, address: 'nope' })).status, 400);
  assert.equal((await post('/devices', { ...good, prefs: { confirmed: true } })).status, 400);

  assert.equal((await post('/devices', good)).status, 200);
  assert.equal(pushed.length, 0); // the first phone has nobody to warn
  assert.equal((await post('/devices', { ...good, token: TOKEN_2 })).status, 200);
  assert.deepEqual(pushed.map((m) => [m.to, m.title]), [[TOKEN_1, 'New phone added']]);
  assert.equal((await post('/devices', { ...good, token: TOKEN_2 })).status, 200);
  assert.equal(pushed.length, 1); // updating a known phone is not a new phone

  assert.equal((await post('/devices', { token: TOKEN_2 }, 'DELETE')).status, 200);
});

test('a client that hammers an endpoint is told to slow down', async () => {
  let limited: Response | undefined;
  for (let i = 0; i < 20 && !limited; i++) {
    const response = await post('/devices', { token: 'bad' });
    if (response.status === 429) limited = response;
  }
  assert.ok(limited, 'expected a 429');
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});
