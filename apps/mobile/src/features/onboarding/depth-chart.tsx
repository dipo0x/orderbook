import { Text, View } from 'react-native';

const BAR_WIDTH = 12.5;
const BASELINE = 189;
const CENTER = 149;

// Cumulative bar heights moving away from the mid price.
const BID_HEIGHTS = [4, 10, 15, 22, 29, 39, 48, 91, 99, 110, 118, 130];
const ASK_HEIGHTS = [5, 9, 16, 21, 30, 38, 49, 59, 73, 83, 96, 111];

function Step({ left, height, side }: { left: number; height: number; side: 'buy' | 'sell' }) {
  const top = BASELINE - height;
  const isBuy = side === 'buy';

  return (
    <>
      <View
        className={`absolute w-[12.5px] ${isBuy ? 'bg-buy-depth' : 'bg-sell-depth'}`}
        style={{ left, top, height }}
      />
      <View
        className={`absolute h-0.5 w-[12.5px] ${isBuy ? 'bg-buy' : 'bg-sell'}`}
        style={{ left, top }}
      />
    </>
  );
}

export function DepthChart() {
  return (
    <View className="h-[232px] w-[300px] overflow-hidden rounded-2xl border border-line bg-surface">
      {BID_HEIGHTS.map((height, i) => (
        <Step key={`bid-${i}`} side="buy" height={height} left={CENTER - BAR_WIDTH * (i + 1)} />
      ))}
      {ASK_HEIGHTS.map((height, i) => (
        <Step key={`ask-${i}`} side="sell" height={height} left={CENTER + BAR_WIDTH * i} />
      ))}
      <View className="absolute -left-px top-[189px] h-px w-[300px] bg-line" />
      <View className="absolute left-[149px] top-[39px] h-[150px] w-px bg-line-strong" />
      <View className="absolute left-[113px] top-[13px] rounded bg-raised px-1.5 py-0.5">
        <Text className="font-jetbrains text-[11px] leading-4 text-ink">62,481.35</Text>
      </View>
      <View className="absolute left-[29px] top-[72px] rounded bg-live-bg px-1.5 py-0.5">
        <Text className="font-jetbrains text-[11px] leading-4 text-buy">Buy wall · 4.5 BTC</Text>
      </View>
      <Text className="absolute left-[15px] top-[201px] font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-buy">
        BIDS
      </Text>
      <Text className="absolute left-[252px] top-[201px] font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-sell">
        ASKS
      </Text>
    </View>
  );
}
