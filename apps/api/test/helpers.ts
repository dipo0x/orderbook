import type { Config } from '../src/config.ts';

export const A = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';
export const B = 'Hc6g9Q23hQe3Ej4kiqujcrRpyzghofpFj9ZojnUau2Gp';
export const C = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
export const TOKEN_1 = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
export const TOKEN_2 = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

export const config: Config = {
  port: 0,
  upstream: { 'mainnet-beta': 'http://main', devnet: 'http://dev', testnet: 'http://test' },
  dbPath: ':memory:',
  flaggedFile: '',
  expoPushUrl: 'http://push',
  watchIntervalMs: 15_000,
  largeTransferSol: 10,
  priceAlertPercent: 5,
  trustProxy: false,
};

export const prefs = { confirmed: true, incoming: true, priceAlerts: true, newSignIn: true, largeTransfer: true };

/** A fetch that answers from a function, so tests never touch the network. */
export function fakeFetch(handler: (url: string, init?: RequestInit) => unknown, status = 200): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const out = await handler(String(input), init);
    return new Response(JSON.stringify(out), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}
