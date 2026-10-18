import { View } from 'react-native';

// Bar widths at the 96px reference size from Figma. Everything else scales with `size`.
const BARS = [33, 51, 24];

export function LogoMark({ size = 96 }: { size?: number }) {
  const scale = size / 96;

  return (
    <View
      className="items-end justify-center rounded-2xl bg-accent"
      style={{ width: size, height: size, gap: 7.5 * scale, paddingRight: 21 * scale }}>
      {BARS.map((width) => (
        <View
          key={width}
          className="rounded-[3px] bg-canvas"
          style={{ width: width * scale, height: 9 * scale }}
        />
      ))}
    </View>
  );
}
