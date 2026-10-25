import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HttpError } from '../src/http.ts';
import { forwardRpc, validateRpcRequest } from '../src/rpc-proxy.ts';
import { config, fakeFetch } from './helpers.ts';

const call = (method: string, params: unknown[] = []) => ({ jsonrpc: '2.0', id: 1, method, params });

test('allows the calls the wallet needs', () => {
  for (const method of ['getBalance', 'sendTransaction', 'simulateTransaction', 'getSignaturesForAddress']) {
    assert.equal(validateRpcRequest(call(method), 'devnet').method, method);
  }
});

test('refuses methods outside the allowlist', () => {
  assert.throws(() => validateRpcRequest(call('getProgramAccounts'), 'devnet'), (e: HttpError) => e.status === 403);
  assert.throws(() => validateRpcRequest(call('requestAirdrop'), 'mainnet-beta'), (e: HttpError) => e.status === 403);
});

test('the faucet is only available on test networks', () => {
  assert.equal(validateRpcRequest(call('requestAirdrop'), 'devnet').method, 'requestAirdrop');
  assert.equal(validateRpcRequest(call('requestAirdrop'), 'testnet').method, 'requestAirdrop');
});

test('rejects batches and malformed bodies', () => {
  assert.throws(() => validateRpcRequest([call('getBalance')], 'devnet'), (e: HttpError) => e.code === 'batch_not_allowed');
  assert.throws(() => validateRpcRequest('hello', 'devnet'), (e: HttpError) => e.status === 400);
  assert.throws(() => validateRpcRequest({ method: 5 }, 'devnet'), (e: HttpError) => e.status === 400);
  assert.throws(() => validateRpcRequest({ method: 'getBalance', params: {} }, 'devnet'), (e: HttpError) => e.status === 400);
});

test('forwards to the right network and returns the answer untouched', async () => {
  const seen: string[] = [];
  const upstream = {
    urls: config.upstream,
    timeoutMs: 1000,
    fetch: fakeFetch((url) => {
      seen.push(url);
      return { jsonrpc: '2.0', id: 1, result: { value: 42 } };
    }),
  };
  const answer = await forwardRpc(upstream, 'mainnet-beta', validateRpcRequest(call('getBalance'), 'mainnet-beta'));
  assert.deepEqual(answer, { jsonrpc: '2.0', id: 1, result: { value: 42 } });
  assert.deepEqual(seen, ['http://main']);
});

test('maps upstream trouble to clear errors', async () => {
  const request = validateRpcRequest(call('getBalance'), 'devnet');
  const busy = { urls: config.upstream, timeoutMs: 1000, fetch: fakeFetch(() => ({}), 429) };
  await assert.rejects(() => forwardRpc(busy, 'devnet', request), (e: HttpError) => e.status === 503);
  const broken = { urls: config.upstream, timeoutMs: 1000, fetch: fakeFetch(() => ({}), 500) };
  await assert.rejects(() => forwardRpc(broken, 'devnet', request), (e: HttpError) => e.status === 502);
  const down = { urls: config.upstream, timeoutMs: 1000, fetch: (async () => { throw new Error('offline'); }) as typeof fetch };
  await assert.rejects(() => forwardRpc(down, 'devnet', request), (e: HttpError) => e.code === 'upstream_unreachable');
});
