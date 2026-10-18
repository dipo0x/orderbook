import { Pressable, StyleSheet, Text } from 'react-native';

import { DesignFonts, Palette } from '@/constants/design';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
};

export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Palette.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: DesignFonts.sansSemibold,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.bgCanvas,
  },
});
