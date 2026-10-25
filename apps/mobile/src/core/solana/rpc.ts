import { apiBaseUrl, apiJson } from '../api';
import { getCluster, getRpcUrl } from './network';

let nextId = 1;

type RpcAnswer<T> = { result?: T; error?: { message: string } };

/** Sends one JSON-RPC call straight to the public node for the selected network. */
async function direct<T>(method: string, payload: string): Promise<RpcAnswer<T>> {
  const response = await fetch(getRpcUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
  if (!response.ok) throw new Error(`RPC ${method} failed: HTTP ${response.status}`);
  return (await response.json()) as RpcAnswer<T>;
}

/**
 * One JSON-RPC call to the Solana node. Goes through the backend proxy when one is configured, and
 * falls back to the public node if the proxy is down. Throws with the node's own message on failure.
 */
async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const payload = JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params });
  let json: RpcAnswer<T> | null = null;

  let response: Response | null = null;
  if (apiBaseUrl) {
    try {
      response = await apiJson(`/rpc/${getCluster()}`, JSON.parse(payload), 'POST', 20_000);
    } catch {
      response = null; // the backend can't be reached: use the public node
    }
  }
  // Server trouble (5xx) also falls back. Anything else is a real answer, including a deliberate refusal.
  if (response && response.status < 500) {
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message ?? `RPC ${method} failed: HTTP ${response.status}`);
    }
    json = (await response.json()) as RpcAnswer<T>;
  }

  json ??= await direct<T>(method, payload);
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

export async function getBalance(address: string): Promise<bigint> {
  const { value } = await rpc<{ value: number }>('getBalance', [address, { commitment: 'confirmed' }]);
  return BigInt(value);
}

export async function getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  const { value } = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
    'getLatestBlockhash',
    [{ commitment: 'confirmed' }],
  );
  return value;
}

export type SimulationResult = {
  err: unknown;
  logs: string[] | null;
  unitsConsumed?: number;
};

/** Runs a signed transaction against current chain state without sending it. */
export async function simulateTransaction(wireBase64: string): Promise<SimulationResult> {
  const { value } = await rpc<{ value: SimulationResult }>('simulateTransaction', [
    wireBase64,
    { encoding: 'base64', sigVerify: true, commitment: 'confirmed' },
  ]);
  return value;
}

export function sendTransaction(wireBase64: string): Promise<string> {
  return rpc<string>('sendTransaction', [
    wireBase64,
    { encoding: 'base64', preflightCommitment: 'confirmed' },
  ]);
}

export type SignatureStatus = {
  confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null;
  err: unknown;
} | null;

export async function getSignatureStatus(signature: string): Promise<SignatureStatus> {
  const { value } = await rpc<{ value: SignatureStatus[] }>('getSignatureStatuses', [
    [signature],
    { searchTransactionHistory: true },
  ]);
  return value[0] ?? null;
}

/** Devnet faucet. Rate limited, so it can fail when many people ask at once. */
export function requestAirdrop(address: string, lamports: bigint): Promise<string> {
  return rpc<string>('requestAirdrop', [address, Number(lamports)]);
}

export type TokenBalance = {
  mint: string;
  /** Raw integer amount in the token's smallest unit. */
  amount: bigint;
  decimals: number;
};

/** Every SPL token account the wallet owns, with its raw balance and decimals. */
export async function getTokenBalances(owner: string): Promise<TokenBalance[]> {
  const { value } = await rpc<{
    value: {
      account: {
        data: { parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number } } } };
      };
    }[];
  }>('getTokenAccountsByOwner', [
    owner,
    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    { encoding: 'jsonParsed', commitment: 'confirmed' },
  ]);
  return value.map(({ account }) => {
    const { mint, tokenAmount } = account.data.parsed.info;
    return { mint, amount: BigInt(tokenAmount.amount), decimals: tokenAmount.decimals };
  });
}

export type ParsedActivity = {
  signature: string;
  blockTime: number | null;
  slot: number | null;
  /** Change in the wallet's SOL balance from this transaction, fee included. */
  lamportDelta: bigint;
  /** Lamports the network charged for this transaction. */
  fee: bigint;
  /** The other side of the transfer: who sent to us, or who we sent to. Null if it isn't a plain transfer. */
  counterparty: string | null;
  failed: boolean;
};

type RawTransaction = {
  slot: number;
  meta: { preBalances: number[]; postBalances: number[]; fee: number } | null;
  transaction: { message: { accountKeys: (string | { pubkey: string })[] } };
};

async function parseTransaction(
  address: string,
  signature: string,
  blockTime: number | null,
  failed: boolean,
): Promise<ParsedActivity> {
  const tx = await rpc<RawTransaction | null>('getTransaction', [
    signature,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
  ]);
  const keys = tx?.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey)) ?? [];
  const index = keys.indexOf(address);
  const deltaAt = (i: number) =>
    tx?.meta ? BigInt(tx.meta.postBalances[i]) - BigInt(tx.meta.preBalances[i]) : 0n;
  const delta = index >= 0 ? deltaAt(index) : 0n;
  // The counterparty is the account whose balance moved the opposite way (ignoring the fee payer's fee).
  const counterIndex = keys.findIndex((_, i) => i !== index && (delta > 0n ? deltaAt(i) < 0n : deltaAt(i) > 0n));
  return {
    signature,
    blockTime: blockTime ?? null,
    slot: tx?.slot ?? null,
    lamportDelta: delta,
    fee: BigInt(tx?.meta?.fee ?? 0),
    counterparty: delta !== 0n && counterIndex >= 0 ? keys[counterIndex] : null,
    failed,
  };
}

/** The wallet's most recent transactions, with how much each changed its SOL balance. */
export async function getRecentActivity(address: string, limit = 5): Promise<ParsedActivity[]> {
  const signatures = await rpc<{ signature: string; blockTime: number | null; err: unknown }[]>(
    'getSignaturesForAddress',
    [address, { limit, commitment: 'confirmed' }],
  );
  return Promise.all(
    signatures.map(({ signature, blockTime, err }) => parseTransaction(address, signature, blockTime, err !== null)),
  );
}

/** One transaction by signature, from the point of view of `address`. Null if the node can't find it. */
export async function getTransactionDetail(address: string, signature: string): Promise<ParsedActivity | null> {
  const [status] = await rpc<{ value: ({ err: unknown } | null)[] }>('getSignatureStatuses', [
    [signature],
    { searchTransactionHistory: true },
  ]).then((r) => r.value);
  if (!status) return null;
  const tx = await rpc<{ blockTime: number | null } | null>('getTransaction', [
    signature,
    { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
  ]);
  return parseTransaction(address, signature, tx?.blockTime ?? null, status.err !== null);
}

/** What the network will charge for this exact message, in lamports (null if it can't price it). */
export async function getFeeForMessage(messageBase64: string): Promise<bigint | null> {
  const { value } = await rpc<{ value: number | null }>('getFeeForMessage', [
    messageBase64,
    { commitment: 'confirmed' },
  ]);
  return value === null ? null : BigInt(value);
}

/**
 * Dry-runs a transaction that has no signature yet, against the latest blockhash. This is how the
 * review screen can show what a transaction will do (or why it would fail) before anyone is asked
 * to authenticate, because nothing has been signed.
 */
export async function simulateUnsigned(wireBase64: string): Promise<SimulationResult> {
  const { value } = await rpc<{ value: SimulationResult }>('simulateTransaction', [
    wireBase64,
    { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' },
  ]);
  return value;
}

/** How many transactions this address has been part of, up to `limit` (one cheap call). */
export async function countSignatures(address: string, limit = 100): Promise<number> {
  const rows = await rpc<unknown[]>('getSignaturesForAddress', [address, { limit, commitment: 'confirmed' }]);
  return rows.length;
}
