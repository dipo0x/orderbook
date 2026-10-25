import type { SolanaCluster } from '@orderbook/shared';

export type Config = {
  port: number;
  /** Where each network's JSON-RPC requests are forwarded. Put a provider URL with an API key here. */
  upstream: Record<SolanaCluster, string>;
  dbPath: string;
  flaggedFile: string;
  expoPushUrl: string;
  watchIntervalMs: number;
  /** An outgoing transfer of at least this many SOL triggers the "large transfer" alert. */
  largeTransferSol: number;
  /** A move of at least this many percent in an hour triggers a price alert. */
  priceAlertPercent: number;
  /** Trust the X-Forwarded-For header for client IPs. Only turn on behind your own proxy. */
  trustProxy: boolean;
};

const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: number(env.PORT, 3000),
    upstream: {
      'mainnet-beta': env.RPC_URL_MAINNET ?? 'https://api.mainnet-beta.solana.com',
      devnet: env.RPC_URL_DEVNET ?? 'https://api.devnet.solana.com',
      testnet: env.RPC_URL_TESTNET ?? 'https://api.testnet.solana.com',
    },
    dbPath: env.DB_PATH ?? './data/api.db',
    flaggedFile: env.FLAGGED_FILE ?? './data/flagged-addresses.json',
    expoPushUrl: env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send',
    watchIntervalMs: number(env.WATCH_INTERVAL_MS, 15_000),
    largeTransferSol: number(env.LARGE_TRANSFER_SOL, 10),
    priceAlertPercent: number(env.PRICE_ALERT_PERCENT, 5),
    trustProxy: env.TRUST_PROXY === '1',
  };
}
