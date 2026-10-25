import { apiFetch } from '../api';
import type { Candle, Instrument, Ticker, Timeframe, Trade } from './types';

const REST_URL = 'https://www.okx.com/api/v5';

async function get<T>(path: string): Promise<T[]> {
  const response = await fetch(`${REST_URL}${path}`);
  const json = (await response.json()) as { code: string; msg: string; data: T[] };
  if (json.code !== '0') throw new Error(`OKX: ${json.msg || json.code}`);
  return json.data;
}

/** Spot tickers from the backend's shared cache when there is one, otherwise straight from OKX. */
async function spotTickers(ids?: readonly string[]): Promise<Ticker[]> {
  try {
    const response = await apiFetch(`/prices${ids ? `?ids=${ids.join(',')}` : ''}`);
    if (response.ok) return ((await response.json()) as { data: Ticker[] }).data;
  } catch {
    // No backend, or it is down: ask OKX directly.
  }
  const rows = await get<Ticker>('/market/tickers?instType=SPOT');
  return ids ? rows.filter((row) => ids.includes(row.instId)) : rows;
}

export function fetchTickers(instIds: readonly string[]): Promise<Ticker[]> {
  return spotTickers(instIds);
}

/** Every SPOT market's ticker, for search. One request; filtering happens on the device. */
export function fetchAllSpotTickers(): Promise<Ticker[]> {
  return spotTickers();
}

export async function fetchInstrument(instId: string): Promise<Instrument | null> {
  const [row] = await get<{ instId: string; baseCcy: string; quoteCcy: string; tickSz: string; lotSz: string }>(
    `/public/instruments?instType=SPOT&instId=${instId}`,
  );
  if (!row) return null;
  return { instId: row.instId, base: row.baseCcy, quote: row.quoteCcy, tickSz: row.tickSz, lotSz: row.lotSz };
}

/** Candles come back newest first as [ts, o, h, l, c, vol, ...]; returned oldest first. */
export async function fetchCandles(instId: string, bar: Timeframe, limit = 300): Promise<Candle[]> {
  const rows = await get<string[]>(`/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
  return rows
    .map(([ts, open, high, low, close, volume]) => ({
      ts: Number(ts),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    }))
    .reverse();
}

type RawTrade = { tradeId: string; px: string; sz: string; side: 'buy' | 'sell'; ts: string };

export function parseTrade(raw: RawTrade): Trade {
  return { id: raw.tradeId, price: raw.px, size: raw.sz, side: raw.side, ts: Number(raw.ts) };
}

export async function fetchTrades(instId: string, limit = 40): Promise<Trade[]> {
  return (await get<RawTrade>(`/market/trades?instId=${instId}&limit=${limit}`)).map(parseTrade);
}
