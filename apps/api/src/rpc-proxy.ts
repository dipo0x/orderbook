import type { SolanaCluster } from '@orderbook/shared';

import { HttpError } from './http.ts';

/** Only the calls the wallet needs are forwarded, so the proxy can't be used as a free general-purpose node. */
export const ALLOWED_METHODS = new Set([
  'getBalance',
  'getLatestBlockhash',
  'getFeeForMessage',
  'simulateTransaction',
  'sendTransaction',
  'getSignatureStatuses',
  'getTransaction',
  'getSignaturesForAddress',
  'getTokenAccountsByOwner',
]);

/** Faucet requests only make sense on networks with test money. */
const TEST_NETWORK_ONLY = new Set(['requestAirdrop']);

export const CLUSTERS: SolanaCluster[] = ['mainnet-beta', 'devnet', 'testnet'];

export type RpcRequest = { jsonrpc: '2.0'; id: string | number | null; method: string; params: unknown[] };

export function isCluster(value: string): value is SolanaCluster {
  return (CLUSTERS as string[]).includes(value);
}

/** Checks a request body is one well-formed, allowed JSON-RPC call. Throws an HttpError otherwise. */
export function validateRpcRequest(body: unknown, cluster: SolanaCluster): RpcRequest {
  if (Array.isArray(body)) throw new HttpError(400, 'batch_not_allowed', 'Batch requests are not supported.');
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'bad_request', 'Expected a JSON-RPC object.');

  const { id = null, method, params = [] } = body as Record<string, unknown>;
  if (typeof method !== 'string') throw new HttpError(400, 'bad_request', 'Missing method.');
  if (!Array.isArray(params)) throw new HttpError(400, 'bad_request', 'params must be an array.');
  if (id !== null && typeof id !== 'string' && typeof id !== 'number') throw new HttpError(400, 'bad_request', 'Bad id.');

  const allowed = ALLOWED_METHODS.has(method) || (TEST_NETWORK_ONLY.has(method) && cluster !== 'mainnet-beta');
  if (!allowed) throw new HttpError(403, 'method_not_allowed', `The method ${method} is not available through this API.`);
  return { jsonrpc: '2.0', id, method, params };
}

export type Upstream = {
  urls: Record<SolanaCluster, string>;
  fetch: typeof fetch;
  timeoutMs: number;
};

/** Forwards one validated call to the node for that network and returns the node's JSON answer untouched. */
export async function forwardRpc(upstream: Upstream, cluster: SolanaCluster, request: RpcRequest): Promise<unknown> {
  let response: Response;
  try {
    response = await upstream.fetch(upstream.urls[cluster], {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(upstream.timeoutMs),
    });
  } catch {
    throw new HttpError(502, 'upstream_unreachable', 'The Solana node did not answer in time.');
  }
  if (response.status === 429) throw new HttpError(503, 'upstream_busy', 'The Solana node is busy. Try again shortly.');
  if (!response.ok) throw new HttpError(502, 'upstream_error', `The Solana node returned HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new HttpError(502, 'upstream_error', 'The Solana node returned something unreadable.');
  }
}

/** Small helper for the server's own calls (risk checks, watcher): returns `result` or throws the node's error. */
export function createRpcClient(upstream: Upstream) {
  let nextId = 1;
  return async function call<T>(cluster: SolanaCluster, method: string, params: unknown[]): Promise<T> {
    const json = (await forwardRpc(upstream, cluster, { jsonrpc: '2.0', id: nextId++, method, params })) as {
      result?: T;
      error?: { message: string };
    };
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  };
}

export type RpcClient = ReturnType<typeof createRpcClient>;
