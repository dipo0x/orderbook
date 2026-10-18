import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignFonts, Palette } from '@/constants/design';

const BARS = [33, 51, 24];

export function SplashView() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />
      <View style={styles.brand}>
        <View style={styles.logo}>
          {BARS.map((width) => (
            <View key={width} style={[styles.bar, { width }]} />
          ))}
        </View>
        <View style={styles.words}>
          <Text style={styles.name}>orderbook</Text>
          <Text style={styles.tagline}>Live crypto order books</Text>
        </View>
      </View>
      <View style={[styles.footer, { bottom: insets.bottom + 32 }]}>
        <Text style={styles.footerText}>Market data from OKX</Text>
        <Text style={styles.footerText}>v{Constants.expoConfig?.version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgCanvas,
  },
  // The Figma glow is a blurred circle; a soft box shadow gives the same falloff natively.
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(240,185,11,0.07)',
    boxShadow: '0 0 100px 0 rgba(240,185,11,0.07)',
  },
  brand: {
    alignItems: 'center',
    gap: 20,
  },
  logo: {
    width: 96,
    height: 96,
    gap: 7.5,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 21,
    borderRadius: 16,
    backgroundColor: Palette.accent,
  },
  bar: {
    height: 9,
    borderRadius: 3,
    backgroundColor: Palette.bgCanvas,
  },
  words: {
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: DesignFonts.sansBold,
    fontSize: 30,
    lineHeight: 36,
    color: Palette.textPrimary,
  },
  tagline: {
    fontFamily: DesignFonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  footer: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: DesignFonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.textTertiary,
  },
});
