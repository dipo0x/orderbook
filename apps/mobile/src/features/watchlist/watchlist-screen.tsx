import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { changePercent } from '@/core/market/format';
import type { Ticker } from '@/core/market/types';
import { useWatchlist } from '@/lib/watchlist';

import { MarketRow } from '../markets/market-row';
import { useInstruments } from '../markets/use-instruments';
import { useTickers } from '../markets/use-tickers';

type Filter = 'all' | 'gainers' | 'losers' | 'volume';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
  { key: 'volume', label: 'Volume' },
];

const COLUMN = 'flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';

const EMPTY_MESSAGE: Record<Filter, string> = {
  all: '',
  gainers: 'None of your saved markets are up right now.',
  losers: 'None of your saved markets are down right now.',
  volume: '',
};

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`h-8 items-center justify-center rounded-2xl px-3.5 ${
        selected ? 'bg-accent' : 'border border-line bg-surface'
      }`}>
      <Text
        className={`font-inter-medium text-[13px] leading-5 ${selected ? 'text-canvas' : 'text-ink-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyWatchlist() {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-10">
      <View className="size-[72px] items-center justify-center rounded-full bg-surface">
        <Image source={require('@/assets/images/watchlist/icon-star-empty.svg')} className="size-7" />
      </View>
      <Text className="font-inter-semibold text-[16px] leading-6 text-ink">Nothing saved yet</Text>
      <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
        Tap the star on any market to pin it here, so the pairs you actually trade are one tap away.
      </Text>
      <View className="w-[200px]">
        <Button label="Browse markets" onPress={() => router.navigate('/(tabs)/markets')} />
      </View>
    </View>
  );
}

export function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const watchlist = useWatchlist();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState(false);

  // One tickers subscription covers the whole list, over the shared socket.
  const tickers = useTickers(watchlist.ids);
  const instruments = useInstruments(watchlist.ids);

  const rows = useMemo(() => {
    const byRecent = [...watchlist.ids].reverse();
    const change = (id: string) => {
      const ticker: Ticker | undefined = tickers[id];
      return ticker ? changePercent(ticker) : null;
    };
    const volume = (id: string) => Number(tickers[id]?.volCcy24h ?? 0);

    switch (filter) {
      case 'gainers':
        return byRecent.filter((id) => (change(id) ?? 0) > 0).sort((a, b) => (change(b) ?? 0) - (change(a) ?? 0));
      case 'losers':
        return byRecent.filter((id) => (change(id) ?? 0) < 0).sort((a, b) => (change(a) ?? 0) - (change(b) ?? 0));
      case 'volume':
        return byRecent.sort((a, b) => volume(b) - volume(a));
      default:
        return byRecent;
    }
  }, [watchlist.ids, tickers, filter]);

  const isEmpty = watchlist.ids.length === 0;
  // Until saved markets have loaded from storage, show the title only (no empty-state flash).
  if (!watchlist.ready) {
    return (
      <View className="flex-1 bg-canvas px-4 pb-3 pt-2" style={{ paddingTop: insets.top + 8 }}>
        <Text className="font-inter-bold text-[30px] leading-9 text-ink">Watchlist</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pb-3 pt-2">
        <Text className="flex-1 font-inter-bold text-[30px] leading-9 text-ink">Watchlist</Text>
        {isEmpty ? null : (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setEditing((on) => !on)}>
            <Text className="font-inter-medium text-[13px] leading-5 text-accent">
              {editing ? 'Done' : 'Edit'}
            </Text>
          </Pressable>
        )}
      </View>

      {isEmpty ? (
        <EmptyWatchlist />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="flex-row gap-2 px-4 pb-3">
            {FILTERS.map(({ key, label }) => (
              <FilterChip key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
          </View>
          <View className="h-6 flex-row items-center gap-2 border-b border-line px-4">
            <Text className={COLUMN} numberOfLines={1}>
              PAIR / VOL
            </Text>
            <Text className={`${COLUMN} text-right`} numberOfLines={1}>
              LAST PRICE
            </Text>
            <Text className={`${COLUMN} text-right`} numberOfLines={1}>
              24H CHANGE
            </Text>
          </View>

          {rows.map((instId) => (
            <View key={instId} className="flex-row items-center">
              {editing ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${instId} from watchlist`}
                  hitSlop={8}
                  onPress={() => watchlist.toggle(instId)}
                  className="h-16 items-center justify-center pl-4">
                  <Image source={require('@/assets/images/market/icon-star-filled.svg')} className="size-5" />
                </Pressable>
              ) : null}
              <View className="flex-1">
                <MarketRow instId={instId} ticker={tickers[instId]} instrument={instruments[instId]} />
              </View>
            </View>
          ))}

          {rows.length === 0 && EMPTY_MESSAGE[filter] ? (
            <View className="items-center px-8 py-10">
              <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
                {EMPTY_MESSAGE[filter]}
              </Text>
            </View>
          ) : null}

          <View className="px-4 pt-4">
            <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
              Saved markets live in AsyncStorage as a list of instIds. One tickers subscription covers
              the whole list — don&apos;t open a socket per row.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
