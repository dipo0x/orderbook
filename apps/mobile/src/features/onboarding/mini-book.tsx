import { Text, View } from 'react-native';

import { Image } from '@/components/ui/image';
import { StatusPill } from '@/components/ui/status-pill';

type Level = { price: string; size: string; total: string; depth: number };

// depth is the bar length as a share of the row width.
const ASKS: Level[] = [
  { price: '62482.1', size: '0.76562', total: '2.42000', depth: 0.93 },
  { price: '62481.9', size: '0.83799', total: '1.66000', depth: 0.64 },
  { price: '62481.6', size: '0.50865', total: '0.82000', depth: 0.31 },
  { price: '62481.4', size: '0.31014', total: '0.31000', depth: 0.11 },
];

const BIDS: Level[] = [
  { price: '62481.3', size: '0.45092', total: '0.45000', depth: 0.17 },
  { price: '62481', size: '0.62223', total: '1.07000', depth: 0.41 },
  { price: '62480.8', size: '0.95812', total: '2.03000', depth: 0.78 },
  { price: '62480.5', size: '0.55775', total: '2.59000', depth: 1 },
];

function BookRow({ level, side }: { level: Level; side: 'buy' | 'sell' }) {
  const isBuy = side === 'buy';

  return (
    <View className="h-5 flex-row items-center gap-2 px-4">
      <View className="absolute inset-0 flex-row justify-end">
        <View
          className={isBuy ? 'bg-buy-depth' : 'bg-sell-depth'}
          style={{ width: `${level.depth * 100}%` }}
        />
      </View>
      <Text
        className={`flex-1 font-jetbrains-medium text-[12px] leading-5 ${isBuy ? 'text-buy' : 'text-sell'}`}
        numberOfLines={1}>
        {level.price}
      </Text>
      <Text
        className="flex-1 text-right font-jetbrains text-[12px] leading-5 text-ink"
        numberOfLines={1}>
        {level.size}
      </Text>
      <Text
        className="flex-1 text-right font-jetbrains text-[12px] leading-5 text-ink-muted"
        numberOfLines={1}>
        {level.total}
      </Text>
    </View>
  );
}

export function MiniBook() {
  return (
    <View className="w-[300px] overflow-hidden rounded-2xl border border-line bg-surface pb-2">
      <View className="flex-row items-center border-b border-line py-3 pl-4 pr-3">
        <Text className="flex-1 font-inter-medium text-[13px] leading-5 text-ink">BTC-USDT</Text>
        <StatusPill />
      </View>
      {ASKS.map((level) => (
        <BookRow key={level.price} level={level} side="sell" />
      ))}
      <View className="h-11 flex-row items-center gap-1.5 border-y border-line px-4 py-2">
        <Text className="font-jetbrains-bold text-[20px] leading-7 text-buy">62,481.35</Text>
        <Image source={require('@/assets/images/onboarding/icon-arrow-up.svg')} className="size-4" />
        <Text className="flex-1 text-right font-jetbrains text-[11px] leading-4 text-ink-muted">
          0.02 bps
        </Text>
      </View>
      {BIDS.map((level) => (
        <BookRow key={level.price} level={level} side="buy" />
      ))}
    </View>
  );
}
