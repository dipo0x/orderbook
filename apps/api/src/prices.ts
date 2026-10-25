import type { FxResponse } from '@orderbook/shared';

import { CachedValue } from './cache.ts';
import { HttpError } from './http.ts';

export type Ticker = {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
};

const CURRENCIES = ['NGN', 'EUR', 'GBP'];

/** Market prices and currency rates, fetched once and shared by every phone that asks. */
export function createPriceService(deps: { fetch: typeof fetch; now?: () => number }) {
  const spot = new CachedValue<Ticker[]>(
    async () => {
      const response = await deps.fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT', {
        signal: AbortSignal.timeout(8_000),
      });
      const json = (await response.json()) as { code: string; data: Ticker[] };
      if (json.code !== '0') throw new Error('OKX returned an error');
      return json.data;
    },
    5_000,
    5 * 60_000,
    deps.now,
  );

  const fx = new CachedValue<Record<string, number>>(
    async () => {
      const response = await deps.fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8_000) });
      const json = (await response.json()) as { rates?: Record<string, number> };
      if (!json.rates) throw new Error('No rates');
      return Object.fromEntries(CURRENCIES.filter((code) => typeof json.rates![code] === 'number').map((code) => [code, json.rates![code]]));
    },
    60 * 60_000,
    24 * 60 * 60_000,
    deps.now,
  );

  return {
    /** Tickers for the requested markets, or all spot markets if none are named. */
    async tickers(instIds: string[] | null) {
      try {
        const { value, at } = await spot.get();
        const wanted = instIds && new Set(instIds);
        return { data: wanted ? value.filter((row) => wanted.has(row.instId)) : value, at };
      } catch {
        throw new HttpError(502, 'upstream_error', 'Market prices are unavailable right now.');
      }
    },
    async rates(): Promise<FxResponse> {
      try {
        const { value, at } = await fx.get();
        return { base: 'USD', rates: value, at };
      } catch {
        throw new HttpError(502, 'upstream_error', 'Currency rates are unavailable right now.');
      }
    },
  };
}

export type PriceService = ReturnType<typeof createPriceService>;
