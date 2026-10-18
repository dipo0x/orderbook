import { useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';

import { Image } from '@/components/ui/image';
import { formatPrice } from '@/core/market/format';
import type { Candle } from '@/core/market/types';

const HEIGHT = 150;
const LABEL_WIDTH = 72;
const STEP = 8;
const TOP = 8;
const PRICE_SPAN = 114;
const GRID_Y = [8, 46, 84, 122];
const VOLUME_MAX = 21;

type CandleChartProps = {
  candles: Candle[];
  loading: boolean;
  decimals: number;
};

/** Candles with a volume strip, a dashed last-price line and four price labels, as in Figma. */
export function CandleChart({ candles, loading, decimals }: CandleChartProps) {
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(width - LABEL_WIDTH, 0);
  const visible = candles.slice(-Math.max(Math.floor(plotWidth / STEP), 0));

  const high = Math.max(...visible.map((c) => c.high));
  const low = Math.min(...visible.map((c) => c.low));
  const range = high - low || 1;
  const maxVolume = Math.max(...visible.map((c) => c.volume), 1);
  const y = (price: number) => TOP + ((high - price) / range) * PRICE_SPAN;

  const hasData = visible.length > 0;
  const last = visible.at(-1);
  const lastUp = last ? last.close >= last.open : true;

  return (
    <View
      className="h-[150px] overflow-hidden"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {GRID_Y.map((top, i) => (
        <View key={top}>
          <View className="absolute left-0 h-px bg-line" style={{ top, width: plotWidth }} />
          {hasData ? (
            <Text
              className="absolute font-jetbrains text-[11px] leading-4 text-ink-faint"
              style={{ top: top - 8, left: plotWidth + 6 }}>
              {formatPrice(high - (range * i) / 3, decimals)}
            </Text>
          ) : null}
        </View>
      ))}

      {hasData
        ? visible.map((candle, i) => {
            const up = candle.close >= candle.open;
            const bodyTop = y(Math.max(candle.open, candle.close));
            const bodyHeight = Math.max(Math.abs(y(candle.open) - y(candle.close)), 1);
            const wickTop = y(candle.high);
            const volume = Math.max((candle.volume / maxVolume) * VOLUME_MAX, 1);
            const x = 3 + i * STEP;
            return (
              <View key={candle.ts}>
                <View
                  className={`absolute w-px ${up ? 'bg-buy' : 'bg-sell'}`}
                  style={{ left: x + 1, top: wickTop, height: Math.max(y(candle.low) - wickTop, 1) }}
                />
                <View
                  className={`absolute w-1 ${up ? 'bg-buy' : 'bg-sell'}`}
                  style={{ left: x, top: bodyTop, height: bodyHeight }}
                />
                <View
                  className={`absolute w-1 ${up ? 'bg-buy-depth' : 'bg-sell-depth'}`}
                  style={{ left: x, top: HEIGHT - volume, height: volume }}
                />
              </View>
            );
          })
        : null}

      {hasData && last ? (
        <>
          <Image
            source={require('@/assets/images/market/line-dashed.svg')}
            className="absolute left-0 h-px"
            style={{ top: y(last.close), width: plotWidth }}
            contentFit="fill"
          />
          <View
            className={`absolute rounded px-1 py-px ${lastUp ? 'bg-buy' : 'bg-sell'}`}
            style={{ top: y(last.close) - 9, left: plotWidth + 2 }}>
            <Text className="font-jetbrains text-[11px] leading-4 text-canvas">
              {formatPrice(last.close, decimals)}
            </Text>
          </View>
        </>
      ) : null}

      {!hasData && loading ? (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">Loading candles…</Text>
        </View>
      ) : null}
    </View>
  );
}
