import { useEffect, useState } from 'react';

import { fetchTickers } from '@/core/market/okx';
import { okxSocket } from '@/core/market/okx-socket';
import type { Ticker } from '@/core/market/types';

const FLUSH_MS = 250;

export function parseTicker(raw: Ticker): Ticker {
  const { instId, last, open24h, high24h, low24h, vol24h, volCcy24h } = raw;
  return { instId, last, open24h, high24h, low24h, vol24h, volCcy24h };
}

/** Live tickers for a fixed list of markets: a REST snapshot, then the WebSocket tickers channel. */
export function useTickers(instIds: readonly string[]): Record<string, Ticker> {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: Record<string, Ticker> = {};

    // Ticks arrive many times a second; batch them so the list re-renders a few times a second.
    const queue = (ticker: Ticker) => {
      pending[ticker.instId] = parseTicker(ticker);
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const batch = pending;
        pending = {};
        setTickers((prev) => ({ ...prev, ...batch }));
      }, FLUSH_MS);
    };

    fetchTickers(instIds)
      .then((rows) => {
        if (!cancelled) rows.forEach(queue);
      })
      .catch(() => {});

    const unsubscribes = instIds.map((instId) =>
      okxSocket.subscribe({ channel: 'tickers', instId }, ({ data }) => {
        if (data[0]) queue(data[0]);
      }),
    );

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [instIds]);

  return tickers;
}
