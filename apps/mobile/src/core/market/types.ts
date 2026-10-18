export type Ticker = {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  /** 24h volume in the base currency (BTC for BTC-USDT). */
  vol24h: string;
  /** 24h volume in the quote currency (USDT for BTC-USDT). */
  volCcy24h: string;
};

export type Instrument = {
  instId: string;
  base: string;
  quote: string;
  tickSz: string;
  lotSz: string;
};

export type Trade = {
  id: string;
  price: string;
  size: string;
  side: 'buy' | 'sell';
  ts: number;
};

export type Candle = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';
