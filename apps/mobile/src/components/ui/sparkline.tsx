import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';

const LINE = 2;

type SparklineProps = {
  values: number[];
  /** Line color. Pass the up or down color from the theme. */
  color: string;
  height?: number;
};

/** A thin line chart drawn from rotated segments, so it needs no SVG library. */
export function Sparkline({ values, color, height = 56 }: SparklineProps) {
  const [width, setWidth] = useState(0);
  if (values.length < 2) return <View style={{ height }} />;

  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const pad = LINE * 2;
  const points = values.map((value, i) => ({
    x: (i / (values.length - 1)) * width,
    y: pad + (1 - (value - min) / range) * (height - pad * 2),
  }));

  return (
    <View
      style={{ height }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0
        ? points.slice(1).map((end, i) => {
            const start = points[i];
            const length = Math.hypot(end.x - start.x, end.y - start.y);
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: start.x,
                  top: start.y - LINE / 2,
                  width: length + 0.5,
                  height: LINE,
                  borderRadius: LINE / 2,
                  backgroundColor: color,
                  transformOrigin: 'left center',
                  transform: [{ rotate: `${angle}rad` }],
                }}
              />
            );
          })
        : null}
    </View>
  );
}
