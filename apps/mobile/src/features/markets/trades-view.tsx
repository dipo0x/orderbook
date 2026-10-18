import { Text, View } from 'react-native';

import { formatPrice, formatSize, formatTime } from '@/core/market/format';
import type { Trade } from '@/core/market/types';

const HEADER = 'flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';

type TradesViewProps = {
  trades: Trade[];
  base: string;
  quote: string;
  decimals: number;
  sizeDp: number;
};

export function TradesView({ trades, base, quote, decimals, sizeDp }: TradesViewProps) {
  return (
    <View className="pt-2">
      <View className="h-6 flex-row items-center gap-2 px-4">
        <Text className={HEADER} numberOfLines={1}>
          PRICE ({quote})
        </Text>
        <Text className={`${HEADER} text-right`} numberOfLines={1}>
          SIZE ({base})
        </Text>
        <Text className={`${HEADER} text-right`} numberOfLines={1}>
          TIME
        </Text>
      </View>
      {trades.map((trade) => (
        <View key={trade.id} className="h-5 flex-row items-center gap-2 px-4">
          <Text
            className={`flex-1 font-jetbrains-medium text-[12px] leading-5 ${trade.side === 'buy' ? 'text-buy' : 'text-sell'}`}
            numberOfLines={1}>
            {formatPrice(trade.price, decimals)}
          </Text>
          <Text className="flex-1 text-right font-jetbrains text-[12px] leading-5 text-ink" numberOfLines={1}>
            {formatSize(trade.size, sizeDp)}
          </Text>
          <Text
            className="flex-1 text-right font-jetbrains text-[12px] leading-5 text-ink-muted"
            numberOfLines={1}>
            {formatTime(trade.ts)}
          </Text>
        </View>
      ))}
    </View>
  );
}
