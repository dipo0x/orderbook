import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';
import { MARKET_IDS } from '@/core/market/markets';
import { useSettings } from '@/lib/settings';

import { MarketRow } from './market-row';
import { useInstruments } from './use-instruments';
import { useTickers } from './use-tickers';

const COLUMN = 'flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';

export function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const { defaultMarket, lastMarket } = useSettings();
  // The default market (or the last one viewed) is listed first.
  const first = defaultMarket === 'last' ? lastMarket : defaultMarket;
  const ordered = first && (MARKET_IDS as readonly string[]).includes(first) ? [first, ...MARKET_IDS.filter((id) => id !== first)] : MARKET_IDS;
  const tickers = useTickers(MARKET_IDS);
  const instruments = useInstruments(MARKET_IDS);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="font-inter-bold text-[30px] leading-9 text-ink">Markets</Text>
      </View>
      {/* Opens the Search screen, where the typing happens. */}
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search markets"
        onPress={() => router.push('/search')}
        className="px-4 pb-3">
        <View className="h-10 flex-row items-center gap-2 rounded-[10px] bg-surface pl-3 pr-2.5">
          <Image source={require('@/assets/images/market/icon-scan.svg')} className="size-4" />
          <Text className="flex-1 font-inter text-[13px] leading-5 text-ink-faint">Search markets</Text>
        </View>
      </Pressable>
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
      {ordered.map((instId) => (
        <MarketRow key={instId} instId={instId} ticker={tickers[instId]} instrument={instruments[instId]} />
      ))}
      <View className="px-4 pt-4">
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
          Tap a market to open its order book, or the star to save it to your watchlist. Prices update
          live from the OKX tickers channel.
        </Text>
      </View>
    </ScrollView>
  );
}
