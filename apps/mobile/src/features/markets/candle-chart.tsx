import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';

import { Image } from '@/components/ui/image';
import { formatPrice } from '@/core/market/format';
import type { Candle } from '@/core/market/types';

const HEIGHT = 150;
const LABEL_WIDTH = 72;
const DEFAULT_STEP = 8;
const MIN_CANDLES = 15;
const MAX_CANDLES = 150;
const TOP = 8;
const PRICE_SPAN = 114;
const GRID_Y = [8, 46, 84, 122];
const VOLUME_MAX = 21;

type CandleChartProps = {
  candles: Candle[];
  loading: boolean;
  decimals: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Candles with a volume strip, a dashed last-price line and four price labels, as in Figma.
 * Pinch to zoom (fewer or more candles on screen) and drag sideways to look back in time.
 * Remount it (via `key`) to reset the zoom, e.g. when the timeframe changes.
 */
export function CandleChart({ candles, loading, decimals }: CandleChartProps) {
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(width - LABEL_WIDTH, 0);

  // 0 means "not zoomed yet": fill the width at the default candle spacing.
  const [zoomedCount, setZoomedCount] = useState(0);
  const [offset, setOffset] = useState(0);

  const defaultCount = Math.floor(plotWidth / DEFAULT_STEP);
  const maxCount = Math.max(Math.min(MAX_CANDLES, candles.length), MIN_CANDLES);
  const count = clamp(zoomedCount || defaultCount, MIN_CANDLES, maxCount);
  const maxOffset = Math.max(candles.length - count, 0);
  const shownOffset = Math.min(offset, maxOffset);
  const step = plotWidth > 0 ? plotWidth / count : DEFAULT_STEP;
  const bodyWidth = clamp(step * 0.5, 1, 14);

  const end = candles.length - shownOffset;
  const visible = candles.slice(Math.max(end - count, 0), end);

  // Gesture callbacks always need the latest numbers, so they read them from a ref.
  const live = useRef({ step, maxOffset, maxCount, count });
  useEffect(() => {
    live.current = { step, maxOffset, maxCount, count };
  });
  const pending = useRef({ drag: 0, zoom: 0 });

  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-8, 8],
    failOffsetY: [-14, 14],
    onBegin: () => {
      pending.current.drag = 0;
    },
    onUpdate: (event) => {
      pending.current.drag += event.changeX;
      const moved = Math.trunc(pending.current.drag / live.current.step);
      if (moved === 0) return;
      pending.current.drag -= moved * live.current.step;
      // Dragging right pulls older candles into view.
      setOffset((current) => clamp(current + moved, 0, live.current.maxOffset));
    },
  });

  const pinch = usePinchGesture({
    runOnJS: true,
    onBegin: () => {
      pending.current.zoom = live.current.count;
    },
    onUpdate: (event) => {
      // Spreading fingers (scaleChange > 1) shows fewer, wider candles.
      pending.current.zoom = clamp(
        pending.current.zoom / event.scaleChange,
        MIN_CANDLES,
        live.current.maxCount,
      );
      setZoomedCount(Math.round(pending.current.zoom));
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const high = Math.max(...visible.map((c) => c.high));
  const low = Math.min(...visible.map((c) => c.low));
  const range = high - low || 1;
  const maxVolume = Math.max(...visible.map((c) => c.volume), 1);
  const y = (price: number) => TOP + ((high - price) / range) * PRICE_SPAN;

  const hasData = visible.length > 0;
  const last = visible.at(-1);
  const lastUp = last ? last.close >= last.open : true;

  return (
    <GestureDetector gesture={gesture}>
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
            const x = i * step + (step - bodyWidth) / 2;
            return (
              <View key={candle.ts}>
                <View
                  className={`absolute w-px ${up ? 'bg-buy' : 'bg-sell'}`}
                  style={{
                    left: x + bodyWidth / 2,
                    top: wickTop,
                    height: Math.max(y(candle.low) - wickTop, 1),
                  }}
                />
                <View
                  className={`absolute ${up ? 'bg-buy' : 'bg-sell'}`}
                  style={{ left: x, width: bodyWidth, top: bodyTop, height: bodyHeight }}
                />
                <View
                  className={`absolute ${up ? 'bg-buy-depth' : 'bg-sell-depth'}`}
                  style={{ left: x, width: bodyWidth, top: HEIGHT - volume, height: volume }}
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
    </GestureDetector>
  );
}
