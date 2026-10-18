import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { DesignFonts, Palette } from '@/constants/design';

const ITEMS = ['No sign-up or email', 'No API keys to manage', 'Read-only — no funds, no trades'];

export function Checklist() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Public market data</Text>
        <Text style={styles.subtitle}>wss://ws.okx.com · public channel</Text>
      </View>
      {ITEMS.map((label) => (
        <View key={label} style={styles.item}>
          <View style={styles.check}>
            <Image
              source={require('@/assets/images/onboarding/icon-check.svg')}
              style={styles.checkIcon}
            />
          </View>
          <Text style={styles.itemText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    paddingBottom: 8,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.borderDefault,
    backgroundColor: Palette.bgSurface,
  },
  header: {
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderDefault,
  },
  title: {
    fontFamily: DesignFonts.sansMedium,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.textPrimary,
  },
  subtitle: {
    fontFamily: DesignFonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.textSecondary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.statusLiveBg,
  },
  checkIcon: { width: 16, height: 16 },
  itemText: {
    fontFamily: DesignFonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.textPrimary,
  },
});
