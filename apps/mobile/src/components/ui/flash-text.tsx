import { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

import { useSettings } from '@/lib/settings';

type FlashTextProps = {
  /** The number being shown. When it changes the text briefly flashes green (up) or red (down). */
  value: number | null;
  className?: string;
  children: string;
};

/** Text for a live price that flashes when the price moves, if "Flash on price change" is on. */
export function FlashText({ value, className, children }: FlashTextProps) {
  const { flashOnChange } = useSettings();
  const previous = useRef(value);
  const [up] = useState(() => new Animated.Value(0));
  const [down] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (!flashOnChange || before === null || value === null || before === value) return;
    const flash = value > before ? up : down;
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: true }).start();
  }, [value, flashOnChange, up, down]);

  return (
    <Animated.View className="relative justify-center overflow-hidden rounded px-1">
      <Animated.View pointerEvents="none" className="absolute inset-0 bg-buy-depth" style={{ opacity: up }} />
      <Animated.View pointerEvents="none" className="absolute inset-0 bg-sell-depth" style={{ opacity: down }} />
      <Text className={className}>{children}</Text>
    </Animated.View>
  );
}
