import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { DesignFonts, Palette, Radius } from '@/constants/design';

/** Connection status pill. Only the LIVE variant exists so far. */
export function StatusPill({ label = 'LIVE' }: { label?: string }) {
  return (
    <View style={styles.pill}>
      <Image source={require('@/assets/images/onboarding/status-dot.svg')} style={styles.dot} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Palette.statusLiveBg,
  },
  dot: {
    width: 6,
    height: 6,
  },
  label: {
    fontFamily: DesignFonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: Palette.statusLive,
  },
});
