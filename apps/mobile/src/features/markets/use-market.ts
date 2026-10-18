import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { decimalsOf } from '@/core/market/format';
import { fetchCandles, fetchTickers, fetchTrades, parseTrade } from '@/core/market/okx';
import { okxSocket } from '@/core/market/okx-socket';
import { type BookView, OrderBook } from '@/core/market/order-book';
import type { Candle, Ticker, Timeframe, Trade } from '@/core/market/types';

import { useInstruments } from './use-instruments';
import { parseTicker } from './use-tickers';

export type MarketStatus = 'connecting' | 'live' | 'resyncing' | 'reconnecting';

const BOOK_FLUSH_MS = 120;
const CANDLE_REFRESH_MS = 30_000;
const MAX_TRADES = 50;
const BOOK_DEPTH = 7;

type Options = { instId: string; timeframe: Timeframe; group: number };

/**
 * Everything the market detail screen needs: ticker, order book, trades and candles for one
 * market, plus the connection status the status pill and banners show.
 */
export function useMarket({ instId, timeframe, group }: Options) {
  const ids = useMemo(() => [instId], [instId]);
  const instrument = useInstruments(ids)[instId];
  const decimals = instrument ? decimalsOf(instrument.tickSz) : 2;

  const socket = useSyncExternalStore(okxSocket.subscribeState, okxSocket.getState);
  const [now, setNow] = useState(() => Date.now());

  const [ticker, setTicker] = useState<Ticker>();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rawCandles, setRawCandles] = useState<Candle[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [bookView, setBookView] = useState<BookView | null>(null);
  const [resyncing, setResyncing] = useState(false);

  const book = useRef(new OrderBook());
  const viewParams = useRef({ group, decimals });

  // Book updates arrive many times a second, so redraws are batched. The latest grouping is read
  // from a ref when the batch fires, so a change of grouping only needs to schedule a redraw.
  const redrawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redraw = useCallback((delay = BOOK_FLUSH_MS) => {
    if (redrawTimer.current) return;
    redrawTimer.current = setTimeout(() => {
      redrawTimer.current = null;
      const { group: g, decimals: d } = viewParams.current;
      setBookView(book.current.hasSnapshot ? book.current.view(g, BOOK_DEPTH, d) : null);
    }, delay);
  }, []);

  useEffect(() => {
    viewParams.current = { group, decimals };
    redraw(0);
  }, [group, decimals, redraw]);

  useEffect(() => {
    const bookArg = { channel: 'books', instId };
    const orderBook = book.current;

    const unsubscribeBook = okxSocket.subscribe(bookArg, ({ action, data }) => {
      const message = data[0];
      if (!message) return;
      const result =
        action === 'snapshot' ? orderBook.applySnapshot(message) : orderBook.applyUpdate(message);
      if (result === 'gap') {
        // Out of step with OKX: drop the book and ask for a fresh snapshot.
        setResyncing(true);
        okxSocket.resubscribe(bookArg);
      } else if (action === 'snapshot') {
        setResyncing(false);
      }
      redraw();
    });

    const unsubscribeTicker = okxSocket.subscribe({ channel: 'tickers', instId }, ({ data }) => {
      if (data[0]) setTicker(parseTicker(data[0]));
    });

    const unsubscribeTrades = okxSocket.subscribe({ channel: 'trades', instId }, ({ data }) => {
      const fresh = data.map(parseTrade).sort((a, b) => b.ts - a.ts);
      setTrades((prev) => [...fresh, ...prev].slice(0, MAX_TRADES));
    });

    let cancelled = false;
    fetchTickers([instId])
      .then(([first]) => {
        if (!cancelled && first) setTicker((prev) => prev ?? parseTicker(first));
      })
      .catch(() => {});
    fetchTrades(instId, 30)
      .then((initial) => {
        if (!cancelled) setTrades((prev) => (prev.length > 0 ? prev : initial));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (redrawTimer.current) clearTimeout(redrawTimer.current);
      redrawTimer.current = null;
      unsubscribeBook();
      unsubscribeTicker();
      unsubscribeTrades();
      orderBook.clear();
    };
  }, [instId, redraw]);

  // While the connection is down the book can't be trusted, so clear it (as in the design).
  useEffect(
    () =>
      okxSocket.subscribeState(() => {
        if (okxSocket.getState().status !== 'reconnecting') return;
        book.current.clear();
        setBookView(null);
        setResyncing(false);
      }),
    [],
  );
  const reconnecting = socket.status === 'reconnecting';

  const candlesKey = `${instId}:${timeframe}`;
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchCandles(instId, timeframe)
        .then((rows) => {
          if (cancelled) return;
          setRawCandles(rows);
          setLoadedKey(candlesKey);
        })
        .catch(() => {});
    void load();
    const timer = setInterval(() => void load(), CANDLE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [instId, timeframe, candlesKey]);

  // Tick the clock once a second while reconnecting, for the "Reconnecting in 2s…" banner.
  useEffect(() => {
    if (!reconnecting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [reconnecting]);

  // Move the newest candle with the live price so the chart doesn't wait for the next REST refresh.
  const candles = useMemo(() => {
    if (!ticker || rawCandles.length === 0) return rawCandles;
    const last = Number(ticker.last);
    const latest = rawCandles[rawCandles.length - 1];
    const patched = {
      ...latest,
      close: last,
      high: Math.max(latest.high, last),
      low: Math.min(latest.low, last),
    };
    return [...rawCandles.slice(0, -1), patched];
  }, [rawCandles, ticker]);

  // Candles from a previous timeframe stay visible until the new ones arrive.
  const candlesLoading = loadedKey !== candlesKey;

  let status: MarketStatus = 'live';
  if (reconnecting) status = 'reconnecting';
  else if (resyncing) status = 'resyncing';
  else if (!bookView) status = 'connecting';

  const retryInSeconds = reconnecting ? Math.max(0, Math.ceil((socket.retryAt - now) / 1000)) : 0;

  return { instrument, decimals, status, retryInSeconds, ticker, trades, candles, candlesLoading, bookView };
}
