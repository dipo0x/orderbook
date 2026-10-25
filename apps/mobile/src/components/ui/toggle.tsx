import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';

type ToggleProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const TRACK_WIDTH = 52;
const KNOB = 28;
const PAD = 2;

/** On/off switch drawn to the design (52×32 track, white knob), so it looks the same on every iOS version. */
export function Toggle({ label, value, onValueChange, disabled }: ToggleProps) {
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, position]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      className={disabled ? 'opacity-40' : ''}>
      <Animated.View
        className="h-8 justify-center rounded-full"
        style={{
          width: TRACK_WIDTH,
          backgroundColor: position.interpolate({ inputRange: [0, 1], outputRange: ['#2f3742', '#2ebd85'] }),
        }}>
        <Animated.View
          className="rounded-full bg-white"
          style={{
            width: KNOB,
            height: KNOB,
            transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [PAD, TRACK_WIDTH - KNOB - PAD] }) }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
