import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { DesignFonts, Palette } from '@/constants/design';

type Level = { price: string; size: string; total: string; depth: number };

// depth is the bar length as a share of the row width.
const ASKS: Level[] = [
  { price: '62482.1', size: '0.76562', total: '2.42000', depth: 0.93 },
  { price: '62481.9', size: '0.83799', total: '1.66000', depth: 0.64 },
  { price: '62481.6', size: '0.50865', total: '0.82000', depth: 0.31 },
  { price: '62481.4', size: '0.31014', total: '0.31000', depth: 0.11 },
];

const BIDS: Level[] = [
  { price: '62481.3', size: '0.45092', total: '0.45000', depth: 0.17 },
  { price: '62481', size: '0.62223', total: '1.07000', depth: 0.41 },
  { price: '62480.8', size: '0.95812', total: '2.03000', depth: 0.78 },
  { price: '62480.5', size: '0.55775', total: '2.59000', depth: 1 },
];

function BookRow({ level, side }: { level: Level; side: 'buy' | 'sell' }) {
  const color = side === 'buy' ? Palette.marketBuy : Palette.marketSell;
  const depthColor = side === 'buy' ? Palette.marketBuyDepth : Palette.marketSellDepth;

  return (
    <View style={styles.row}>
      <View style={styles.depthTrack}>
        <View style={{ width: `${level.depth * 100}%`, backgroundColor: depthColor }} />
      </View>
      <Text style={[styles.price, { color }]} numberOfLines={1}>
        {level.price}
      </Text>
      <Text style={[styles.cell, styles.size]} numberOfLines={1}>
        {level.size}
      </Text>
      <Text style={[styles.cell, styles.total]} numberOfLines={1}>
        {level.total}
      </Text>
    </View>
  );
}

export function MiniBook() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.pair}>BTC-USDT</Text>
        <StatusPill />
      </View>
      {ASKS.map((level) => (
        <BookRow key={level.price} level={level} side="sell" />
      ))}
      <View style={styles.spread}>
        <Text style={styles.mid}>62,481.35</Text>
        <Image
          source={require('@/assets/images/onboarding/icon-arrow-up.svg')}
          style={styles.arrow}
        />
        <Text style={styles.spreadText}>0.02 bps</Text>
      </View>
      {BIDS.map((level) => (
        <BookRow key={level.price} level={level} side="buy" />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderDefault,
  },
  pair: {
    flex: 1,
    fontFamily: DesignFonts.sansMedium,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.textPrimary,
  },
  row: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  depthTrack: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  price: {
    flex: 1,
    fontFamily: DesignFonts.monoMedium,
    fontSize: 12,
    lineHeight: 20,
  },
  cell: {
    flex: 1,
    textAlign: 'right',
    fontFamily: DesignFonts.mono,
    fontSize: 12,
    lineHeight: 20,
  },
  size: { color: Palette.textPrimary },
  total: { color: Palette.textSecondary },
  spread: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.borderDefault,
  },
  mid: {
    fontFamily: DesignFonts.monoBold,
    fontSize: 20,
    lineHeight: 28,
    color: Palette.marketBuy,
  },
  arrow: { width: 16, height: 16 },
  spreadText: {
    flex: 1,
    textAlign: 'right',
    fontFamily: DesignFonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.textSecondary,
  },
});
