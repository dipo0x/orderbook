import { useEffect, useMemo, useState } from 'react';

import { fetchAllSpotTickers } from '@/core/market/okx';
import type { Ticker } from '@/core/market/types';

import { parseTicker } from '../markets/use-tickers';

const TRENDING_COUNT = 3;
const MAX_RESULTS = 50;

// The market list is fetched once and reused, so typing never makes a request.
let cached: Ticker[] | null = null;
let inflight: Promise<Ticker[]> | null = null;

function load(): Promise<Ticker[]> {
  if (cached) return Promise.resolve(cached);
  inflight ??= fetchAllSpotTickers()
    .then((rows) => {
      cached = rows.map(parseTicker);
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const quoteOf = (instId: string) => instId.split('-')[1] ?? '';
const baseOf = (instId: string) => instId.split('-')[0] ?? '';

// Stablecoin pairs trade a lot but barely move, so they don't belong under "Trending".
const STABLECOINS = new Set(['USDC', 'USDG', 'DAI', 'TUSD', 'FDUSD', 'PYUSD', 'USDT']);

/** USDT markets first, then by 24h volume. Volumes are only comparable within one quote currency. */
function byRelevance(a: Ticker, b: Ticker): number {
  const aUsdt = quoteOf(a.instId) === 'USDT' ? 1 : 0;
  const bUsdt = quoteOf(b.instId) === 'USDT' ? 1 : 0;
  return bUsdt - aUsdt || Number(b.volCcy24h) - Number(a.volCcy24h);
}

export function useSearchMarkets(query: string) {
  const [markets, setMarkets] = useState<Ticker[]>(cached ?? []);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((rows) => {
        if (!cancelled) setMarkets(rows);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => [...markets].sort(byRelevance), [markets]);

  const trending = useMemo(
    () => sorted.filter((ticker) => !STABLECOINS.has(baseOf(ticker.instId))).slice(0, TRENDING_COUNT),
    [sorted],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return sorted.filter((ticker) => ticker.instId.toLowerCase().includes(needle)).slice(0, MAX_RESULTS);
  }, [sorted, query]);

  return { trending, results, loading: markets.length === 0 && !failed, failed };
}
