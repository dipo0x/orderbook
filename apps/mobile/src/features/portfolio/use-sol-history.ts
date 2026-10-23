import { useEffect, useState } from 'react';

import { fetchCandles } from '@/core/market/okx';

let cached: number[] | null = null;

/** SOL's hourly closing prices for the last 24 hours, from OKX. */
export function useSolHistory(): number[] {
  const [closes, setCloses] = useState<number[]>(cached ?? []);

  useEffect(() => {
    let cancelled = false;
    fetchCandles('SOL-USDT', '1H', 24)
      .then((candles) => {
        cached = candles.map((candle) => candle.close);
        if (!cancelled) setCloses(cached);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return closes;
}
