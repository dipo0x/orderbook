import type { RiskCheckResponse, SolanaCluster } from '@orderbook/shared';

import { apiJson } from '@/core/api';

/** Asks the backend whether this recipient looks safe. Null if there is no backend or it can't be reached. */
export async function checkRecipient(
  cluster: SolanaCluster,
  owner: string,
  recipient: string,
): Promise<RiskCheckResponse | null> {
  try {
    const response = await apiJson('/risk/check', { cluster, owner, recipient });
    return response.ok ? ((await response.json()) as RiskCheckResponse) : null;
  } catch {
    return null;
  }
}
