import { Pressable, Text, View } from 'react-native';

import { Image } from '@/components/ui/image';
import { formatGrouping, formatPrice, formatSize } from '@/core/market/format';
import type { BookRow as BookRowData, BookView } from '@/core/market/order-book';

import type { MarketStatus } from './use-market';

const HEADER = 'flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';

function BookRow({
  row,
  side,
  decimals,
  sizeDp,
  height,
}: {
  row: BookRowData;
  side: 'buy' | 'sell';
  decimals: number;
  sizeDp: number;
  height: number;
}) {
  const isBuy = side === 'buy';
  return (
    <View className="flex-row items-center gap-2 px-4" style={{ height }}>
      <View className="absolute inset-0 flex-row justify-end">
        <View
          className={isBuy ? 'bg-buy-depth' : 'bg-sell-depth'}
          style={{ width: `${row.depth * 100}%` }}
        />
      </View>
      <Text
        className={`flex-1 font-jetbrains-medium text-[12px] leading-5 ${isBuy ? 'text-buy' : 'text-sell'}`}
        numberOfLines={1}>
        {formatPrice(row.price, decimals)}
      </Text>
      <Text className="flex-1 text-right font-jetbrains text-[12px] leading-5 text-ink" numberOfLines={1}>
        {formatSize(row.size, sizeDp)}
      </Text>
      <Text
        className="flex-1 text-right font-jetbrains text-[12px] leading-5 text-ink-muted"
        numberOfLines={1}>
        {formatSize(row.total, sizeDp)}
      </Text>
    </View>
  );
}

/** Grey placeholder bars shown while the first snapshot loads. */
function SkeletonRow({ height }: { height: number }) {
  return (
    <View className="flex-row items-center gap-2 px-4" style={{ height }}>
      <View className="flex-1 items-start">
        <View className="h-1.5 w-[72px] rounded-full bg-raised" />
      </View>
      <View className="flex-1 items-end">
        <View className="h-1.5 w-[52px] rounded-full bg-raised" />
      </View>
      <View className="flex-1 items-end">
        <View className="h-1.5 w-[60px] rounded-full bg-raised" />
      </View>
    </View>
  );
}

type OrderBookViewProps = {
  status: MarketStatus;
  book: BookView | null;
  last: number | null;
  /** True when the last price is above the previous one, for the spread bar arrow. */
  lastUp: boolean;
  base: string;
  quote: string;
  decimals: number;
  sizeDp: number;
  group: number;
  /** Rows shown on each side of the spread, sized to the space available. */
  depth: number;
  /** Row height, slightly above 20 so the rows fill the space exactly. */
  rowHeight: number;
  onOpenGrouping: () => void;
};

export function OrderBookView({
  status,
  book,
  last,
  lastUp,
  base,
  quote,
  decimals,
  sizeDp,
  group,
  depth,
  rowHeight,
  onOpenGrouping,
}: OrderBookViewProps) {
  const spread = book?.bestAsk != null && book.bestBid != null ? book.bestAsk - book.bestBid : null;
  const bps = spread !== null && last ? (spread / last) * 10_000 : null;

  let levels;
  if (status === 'reconnecting') {
    levels = (
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <Image source={require('@/assets/images/market/icon-wifi-off-24.svg')} className="size-6" />
        <Text className="font-inter-medium text-[13px] leading-5 text-ink">No connection</Text>
        <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
          The order book was cleared because updates may have been missed. It reloads from a fresh
          snapshot when the socket reconnects.
        </Text>
      </View>
    );
  } else if (!book) {
    levels = (
      <View>
        {Array.from({ length: depth }, (_, i) => (
          <SkeletonRow key={`a${i}`} height={rowHeight} />
        ))}
        <View className="h-11 items-center justify-center border-y border-line">
          <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">
            Waiting for order book snapshot…
          </Text>
        </View>
        {Array.from({ length: depth }, (_, i) => (
          <SkeletonRow key={`b${i}`} height={rowHeight} />
        ))}
      </View>
    );
  } else {
    levels = (
      <View className={status === 'resyncing' ? 'opacity-60' : ''}>
        {book.asks.map((row) => (
          <BookRow key={row.price} row={row} side="sell" decimals={decimals} sizeDp={sizeDp} height={rowHeight} />
        ))}
        <View className="h-11 flex-row items-center gap-1.5 border-y border-line px-4 py-2">
          <Text
            className={`font-jetbrains-bold text-[20px] leading-7 ${lastUp ? 'text-buy' : 'text-sell'}`}>
            {last !== null ? formatPrice(last, decimals) : '—'}
          </Text>
          <Image
            source={require('@/assets/images/onboarding/icon-arrow-up.svg')}
            className={`size-4 ${lastUp ? '' : 'rotate-180'}`}
          />
          <Text className="flex-1 text-right font-jetbrains text-[11px] leading-4 text-ink-muted">
            {spread !== null
              ? `spread ${formatPrice(spread, decimals)} · ${bps !== null ? bps.toFixed(2) : '—'} bps`
              : ''}
          </Text>
        </View>
        {book.bids.map((row) => (
          <BookRow key={row.price} row={row} side="buy" decimals={decimals} sizeDp={sizeDp} height={rowHeight} />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center px-4 pb-1 pt-2">
        <Text className="flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
          Depth
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Price grouping"
          onPress={onOpenGrouping}
          className="flex-row items-center gap-1 rounded border border-line bg-raised py-0.5 pl-2 pr-1.5">
          <Text className="font-jetbrains text-[11px] leading-4 text-ink">{formatGrouping(group)}</Text>
          <Image source={require('@/assets/images/market/icon-chevron-down.svg')} className="size-3.5" />
        </Pressable>
      </View>
      <View className="h-6 flex-row items-center gap-2 px-4">
        <Text className={HEADER} numberOfLines={1}>
          PRICE ({quote})
        </Text>
        <Text className={`${HEADER} text-right`} numberOfLines={1}>
          SIZE ({base})
        </Text>
        <Text className={`${HEADER} text-right`} numberOfLines={1}>
          TOTAL ({base})
        </Text>
      </View>
      {levels}
    </View>
  );
}
