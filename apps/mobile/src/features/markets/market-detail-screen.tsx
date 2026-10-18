import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';
import { StatusBanner } from '@/components/ui/status-banner';
import { StatusPill } from '@/components/ui/status-pill';
import {
  changePercent,
  formatChange,
  formatPrice,
  formatVolume,
  groupingOptions,
  sizeDecimals,
} from '@/core/market/format';
import { splitInstId } from '@/core/market/markets';
import type { Timeframe } from '@/core/market/types';
import { useWatchlist } from '@/lib/watchlist';

import { CandleChart } from './candle-chart';
import { GroupingSheet } from './grouping-sheet';
import { OrderBookView } from './order-book-view';
import { TradesView } from './trades-view';
import { useInstruments } from './use-instruments';
import { useMarket } from './use-market';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D'];
const STAT = 'gap-0.5';
const STAT_LABEL = 'font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';
const STAT_VALUE = 'font-jetbrains-medium text-[12px] leading-5 text-ink';

export function MarketDetailScreen() {
  const insets = useSafeAreaInsets();
  const { instId = 'BTC-USDT' } = useLocalSearchParams<{ instId: string }>();
  const { base, quote } = splitInstId(instId);
  const watchlist = useWatchlist();

  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [tab, setTab] = useState<'book' | 'trades'>('book');
  const [groupChoice, setGroupChoice] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The grouping choices depend on the market's tick size, so they're only known once it loads.
  const ids = useMemo(() => [instId], [instId]);
  const tickSz = useInstruments(ids)[instId]?.tickSz ?? '0.1';
  const options = useMemo(() => groupingOptions(tickSz), [tickSz]);
  const group = groupChoice ?? options[0];

  const market = useMarket({ instId, timeframe, group });
  const { decimals, status, ticker, trades, candles, candlesLoading, bookView } = market;

  const percent = ticker ? changePercent(ticker) : null;
  const price = ticker ? Number(ticker.last) : null;
  const up = percent === null ? true : percent >= 0;
  const sizeDp = sizeDecimals(price ?? 0);
  const lastUp = trades[0] ? trades[0].side === 'buy' : up;
  const starred = watchlist.has(instId);

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <View className="h-11 flex-row items-center gap-1 pl-1 pr-4">
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="size-11 items-center justify-center">
          <Image source={require('@/assets/images/wallet/icon-chevron-left.svg')} className="size-5" />
        </Pressable>
        <View className="flex-1">
          <Text className="font-inter-semibold text-[16px] leading-6 text-ink" numberOfLines={1}>
            {base}-{quote}
          </Text>
          <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
            Spot
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={starred ? 'Remove from watchlist' : 'Add to watchlist'}
          accessibilityState={{ selected: starred }}
          onPress={() => watchlist.toggle(instId)}
          className="size-9 items-center justify-center">
          <Image
            source={
              starred
                ? require('@/assets/images/market/icon-star-filled.svg')
                : require('@/assets/images/market/icon-star.svg')
            }
            className="size-5"
          />
        </Pressable>
        <StatusPill status={status} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        <View className="gap-2 border-b border-line px-4 pb-3 pt-1">
          <View className="flex-row items-baseline gap-2">
            <Text
              className={`font-jetbrains-bold text-[28px] leading-9 ${price === null ? 'text-ink-muted' : up ? 'text-buy' : 'text-sell'}`}>
              {price !== null ? formatPrice(price, decimals) : '—'}
            </Text>
            <Text
              className={`font-jetbrains-medium text-[12px] leading-5 ${percent === null ? 'text-ink-muted' : up ? 'text-buy' : 'text-sell'}`}>
              {percent !== null ? formatChange(percent) : ''}
            </Text>
          </View>
          <View className="flex-row gap-6">
            <View className={STAT}>
              <Text className={STAT_LABEL}>24h High</Text>
              <Text className={STAT_VALUE}>{ticker ? formatPrice(ticker.high24h, decimals) : '—'}</Text>
            </View>
            <View className={STAT}>
              <Text className={STAT_LABEL}>24h Low</Text>
              <Text className={STAT_VALUE}>{ticker ? formatPrice(ticker.low24h, decimals) : '—'}</Text>
            </View>
            <View className={STAT}>
              <Text className={STAT_LABEL}>24h Vol ({base})</Text>
              <Text className={STAT_VALUE}>{ticker ? formatVolume(ticker.vol24h) : '—'}</Text>
            </View>
          </View>
        </View>

        {status === 'resyncing' || status === 'reconnecting' ? (
          <View className="px-4 pt-2">
            {status === 'resyncing' ? (
              <StatusBanner tone="warning" icon={require('@/assets/images/market/icon-refresh.svg')}>
                Missed an update — reloading the order book…
              </StatusBanner>
            ) : (
              <StatusBanner tone="danger" icon={require('@/assets/images/market/icon-wifi-off-16.svg')}>
                {market.retryInSeconds > 0
                  ? `Connection lost. Reconnecting in ${market.retryInSeconds}s…`
                  : 'Connection lost. Reconnecting…'}
              </StatusBanner>
            )}
          </View>
        ) : null}

        <View className="border-b border-line">
          <View className="flex-row gap-1 px-3 pb-1 pt-2">
            {TIMEFRAMES.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: value === timeframe }}
                onPress={() => setTimeframe(value)}
                className={`rounded px-2 py-1 ${value === timeframe ? 'bg-raised' : ''}`}>
                <Text
                  className={`font-jetbrains text-[11px] leading-4 ${value === timeframe ? 'text-ink' : 'text-ink-muted'}`}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <CandleChart candles={candles} loading={candlesLoading} decimals={decimals} />
        </View>

        <View className="flex-row">
          {(['book', 'trades'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              onPress={() => setTab(value)}
              className={`h-11 flex-1 items-center justify-center ${
                tab === value ? 'border-b-2 border-accent' : 'border-b border-line'
              }`}>
              <Text
                className={`font-inter-medium text-[13px] leading-5 ${tab === value ? 'text-ink' : 'text-ink-muted'}`}>
                {value === 'book' ? 'Order Book' : 'Trades'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'book' ? (
          <OrderBookView
            status={status}
            book={bookView}
            last={price}
            lastUp={lastUp}
            base={base}
            quote={quote}
            decimals={decimals}
            sizeDp={sizeDp}
            group={group}
            onOpenGrouping={() => setSheetOpen(true)}
          />
        ) : (
          <TradesView trades={trades} base={base} quote={quote} decimals={decimals} sizeDp={sizeDp} />
        )}
      </ScrollView>

      <GroupingSheet
        visible={sheetOpen}
        options={options}
        selected={group}
        onSelect={setGroupChoice}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}
