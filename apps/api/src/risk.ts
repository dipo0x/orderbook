import type { RiskCheckRequest, RiskCheckResponse, RiskReason } from '@orderbook/shared';

import { isSolanaAddress } from './base58.ts';
import type { RpcClient } from './rpc-proxy.ts';

export type FlaggedList = Map<string, string>;

/** Loads `[{ "address": "...", "reason": "..." }]`. A missing or broken file means an empty list, never a crash. */
export function parseFlaggedList(json: string): FlaggedList {
  try {
    const rows = JSON.parse(json) as { address?: unknown; reason?: unknown }[];
    const list: FlaggedList = new Map();
    for (const row of rows) {
      if (isSolanaAddress(row.address)) list.set(row.address, typeof row.reason === 'string' ? row.reason : 'Reported as a scam.');
    }
    return list;
  } catch {
    return new Map();
  }
}

/**
 * Looks at who money is about to go to. A mistyped address is almost always one nobody has ever used,
 * so "never used" is the strongest hint the server can give without any wallet history.
 */
export async function assessRecipient(
  request: RiskCheckRequest,
  deps: { rpc: RpcClient; flagged: FlaggedList },
): Promise<RiskCheckResponse> {
  const reasons: RiskReason[] = [];
  let block = false;

  if (!isSolanaAddress(request.recipient)) {
    return { level: 'block', reasons: [{ code: 'invalid_address', message: "That isn't a valid Solana address." }] };
  }

  const flaggedReason = deps.flagged.get(request.recipient);
  if (flaggedReason) {
    block = true;
    reasons.push({ code: 'flagged', message: `This address has been flagged: ${flaggedReason}` });
  }

  if (request.recipient === request.owner) {
    reasons.push({ code: 'self_transfer', message: 'You are sending to your own address.' });
  }

  try {
    const [balance, history] = await Promise.all([
      deps.rpc<{ value: number }>(request.cluster, 'getBalance', [request.recipient, { commitment: 'confirmed' }]),
      deps.rpc<unknown[]>(request.cluster, 'getSignaturesForAddress', [request.recipient, { limit: 1 }]),
    ]);
    if (balance.value === 0 && history.length === 0) {
      reasons.push({
        code: 'never_used',
        message: 'Nobody has ever used this address. If you typed it by hand, check every character.',
      });
    }
  } catch {
    // The node being unreachable must not stop a transfer: report only what is known.
  }

  return { level: block ? 'block' : reasons.length > 0 ? 'warn' : 'ok', reasons };
}
