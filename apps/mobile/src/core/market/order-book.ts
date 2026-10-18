/** One level as OKX sends it: [price, size, deprecated, orderCount], all strings. */
export type RawLevel = readonly string[];

export type BookMessage = {
  asks: RawLevel[];
  bids: RawLevel[];
  seqId: number;
  prevSeqId: number;
};

export type ApplyResult = 'ok' | 'gap';

export type BookRow = {
  /** Price as a display-ready number string, already grouped. */
  price: string;
  size: number;
  /** Running total from the spread outward. */
  total: number;
  /** total / the larger side's final total, for the depth bar. */
  depth: number;
};

export type BookView = {
  /** Highest price first, so the lowest ask sits next to the spread. */
  asks: BookRow[];
  bids: BookRow[];
  bestAsk: number | null;
  bestBid: number | null;
};

/**
 * Local copy of OKX's `books` channel: one snapshot, then incremental updates.
 * Updates are only trusted if they arrive in sequence and leave the book uncrossed, otherwise
 * `applyUpdate` returns 'gap' and the caller must resubscribe for a fresh snapshot.
 *
 * OKX's checksum is not used: without a login the public `books` channel sends `checksum: 0`.
 */
export class OrderBook {
  private bids = new Map<string, string>();
  private asks = new Map<string, string>();
  private seqId: number | null = null;

  get hasSnapshot(): boolean {
    return this.seqId !== null;
  }

  clear() {
    this.bids.clear();
    this.asks.clear();
    this.seqId = null;
  }

  applySnapshot(message: BookMessage): ApplyResult {
    this.bids.clear();
    this.asks.clear();
    this.merge(this.bids, message.bids);
    this.merge(this.asks, message.asks);
    this.seqId = message.seqId;
    return this.isCrossed() ? this.fail() : 'ok';
  }

  applyUpdate(message: BookMessage): ApplyResult {
    if (this.seqId === null) return 'gap';
    // Empty message with equal ids is OKX's heartbeat for a quiet book.
    if (message.seqId === message.prevSeqId && message.asks.length + message.bids.length === 0) {
      return 'ok';
    }
    if (message.prevSeqId !== this.seqId) return 'gap';

    this.merge(this.bids, message.bids);
    this.merge(this.asks, message.asks);
    this.seqId = message.seqId;
    return this.isCrossed() ? this.fail() : 'ok';
  }

  private fail(): ApplyResult {
    this.clear();
    return 'gap';
  }

  /** A healthy book never has a bid at or above the best ask. */
  private isCrossed(): boolean {
    let bestBid = -Infinity;
    for (const price of this.bids.keys()) bestBid = Math.max(bestBid, Number(price));
    let bestAsk = Infinity;
    for (const price of this.asks.keys()) bestAsk = Math.min(bestAsk, Number(price));
    return bestBid >= bestAsk;
  }

  private merge(side: Map<string, string>, levels: RawLevel[]) {
    for (const [price, size] of levels) {
      if (Number(size) === 0) side.delete(price);
      else side.set(price, size);
    }
  }

  /**
   * Rows to display: `depth` rows per side, with prices grouped to `group`
   * (bids round down, asks round up, so the two sides never cross).
   * `decimals` is the number of decimal places of the price tick.
   */
  view(group: number, depth: number, decimals: number): BookView {
    const scale = 10 ** decimals;
    const step = Math.max(1, Math.round(group * scale));

    const aggregate = (side: Map<string, string>, descending: boolean) => {
      const buckets = new Map<number, number>();
      for (const [price, size] of side) {
        const scaled = Math.round(Number(price) * scale);
        const bucket = descending
          ? Math.floor(scaled / step) * step
          : Math.ceil(scaled / step) * step;
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + Number(size));
      }
      return [...buckets.entries()].sort((a, b) => (descending ? b[0] - a[0] : a[0] - b[0]));
    };

    const askLevels = aggregate(this.asks, false).slice(0, depth);
    const bidLevels = aggregate(this.bids, true).slice(0, depth);

    const toRows = (levels: [number, number][]): BookRow[] => {
      let total = 0;
      return levels.map(([scaled, size]) => {
        total += size;
        return { price: (scaled / scale).toFixed(decimals), size, total, depth: 0 };
      });
    };

    const asks = toRows(askLevels);
    const bids = toRows(bidLevels);
    const maxTotal = Math.max(asks.at(-1)?.total ?? 0, bids.at(-1)?.total ?? 0, Number.MIN_VALUE);
    for (const row of [...asks, ...bids]) row.depth = row.total / maxTotal;

    return {
      asks: asks.reverse(),
      bids,
      bestAsk: askLevels[0] ? askLevels[0][0] / scale : null,
      bestBid: bidLevels[0] ? bidLevels[0][0] / scale : null,
    };
  }
}
