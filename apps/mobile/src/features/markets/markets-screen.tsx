import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';
import { MARKET_IDS } from '@/core/market/markets';

import { MarketRow } from './market-row';
import { useInstruments } from './use-instruments';
import { useTickers } from './use-tickers';

const COLUMN = 'flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';

export function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const tickers = useTickers(MARKET_IDS);
  const instruments = useInstruments(MARKET_IDS);
  const [query, setQuery] = useState('');

  const visibleIds = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? MARKET_IDS.filter((id) => id.toLowerCase().includes(needle)) : MARKET_IDS;
  }, [query]);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="font-inter-bold text-[30px] leading-9 text-ink">Markets</Text>
      </View>
      <View className="px-4 pb-3">
        <View className="h-10 flex-row items-center gap-2 rounded-[10px] bg-surface pl-3 pr-2.5">
          <Image source={require('@/assets/images/market/icon-scan.svg')} className="size-4" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search markets"
            placeholderTextColor="#4b535d"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search markets"
            className="flex-1 p-0 font-inter text-[13px] leading-5 text-ink"
          />
        </View>
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
      {visibleIds.map((instId) => (
        <MarketRow key={instId} instId={instId} ticker={tickers[instId]} instrument={instruments[instId]} />
      ))}
      {visibleIds.length === 0 ? (
        <View className="items-center px-8 py-10">
          <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
            No markets match “{query.trim()}”.
          </Text>
        </View>
      ) : null}
      <View className="px-4 pt-4">
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
          Tap a market to open its order book, or the star to save it to your watchlist. Prices update
          live from the OKX tickers channel.
        </Text>
      </View>
    </ScrollView>
  );
}
