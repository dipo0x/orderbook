import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  changePercent,
  decimalsOf,
  formatChange,
  formatPrice,
  formatVolume,
} from '@/core/market/format';
import { splitInstId } from '@/core/market/markets';
import type { Instrument, Ticker } from '@/core/market/types';

type MarketRowProps = {
  instId: string;
  ticker?: Ticker;
  instrument?: Instrument;
};

export function MarketRow({ instId, ticker, instrument }: MarketRowProps) {
  const { base, quote } = splitInstId(instId);
  const percent = ticker ? changePercent(ticker) : null;
  const decimals = instrument
    ? decimalsOf(instrument.tickSz)
    : (ticker?.last.split('.')[1]?.length ?? 2);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/market/[instId]', params: { instId } })}
      className="h-16 flex-row items-center gap-3 border-b border-line px-4 active:bg-surface">
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-baseline gap-0.5">
          <Text className="font-inter-semibold text-[16px] leading-6 text-ink">{base}</Text>
          <Text className="font-inter text-[13px] leading-5 text-ink-muted">/{quote}</Text>
        </View>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">
          Vol {ticker ? formatVolume(ticker.volCcy24h) : '—'}
        </Text>
      </View>
      <Text className="text-right font-jetbrains-medium text-[12px] leading-5 text-ink">
        {ticker ? formatPrice(ticker.last, decimals) : '—'}
      </Text>
      <View
        className={`h-7 w-[72px] items-center justify-center rounded ${
          percent === null ? 'bg-raised' : percent < 0 ? 'bg-sell' : 'bg-buy'
        }`}>
        <Text
          className={`font-jetbrains-medium text-[12px] leading-5 ${percent === null ? 'text-ink-muted' : 'text-canvas'}`}>
          {formatChange(percent)}
        </Text>
      </View>
    </Pressable>
  );
}
