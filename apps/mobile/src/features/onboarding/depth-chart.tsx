import { StyleSheet, Text, View } from 'react-native';

import { DesignFonts, Palette } from '@/constants/design';

const BAR_WIDTH = 12.5;
const BASELINE = 189;
const CENTER = 149;

// Cumulative bar heights moving away from the mid price.
const BID_HEIGHTS = [4, 10, 15, 22, 29, 39, 48, 91, 99, 110, 118, 130];
const ASK_HEIGHTS = [5, 9, 16, 21, 30, 38, 49, 59, 73, 83, 96, 111];

function Step({ left, height, side }: { left: number; height: number; side: 'buy' | 'sell' }) {
  const top = BASELINE - height;
  const fill = side === 'buy' ? Palette.marketBuyDepth : Palette.marketSellDepth;
  const cap = side === 'buy' ? Palette.marketBuy : Palette.marketSell;

  return (
    <>
      <View style={[styles.abs, { left, top, width: BAR_WIDTH, height, backgroundColor: fill }]} />
      <View style={[styles.abs, { left, top, width: BAR_WIDTH, height: 2, backgroundColor: cap }]} />
    </>
  );
}

export function DepthChart() {
  return (
    <View style={styles.card}>
      {BID_HEIGHTS.map((height, i) => (
        <Step key={`bid-${i}`} side="buy" height={height} left={CENTER - BAR_WIDTH * (i + 1)} />
      ))}
      {ASK_HEIGHTS.map((height, i) => (
        <Step key={`ask-${i}`} side="sell" height={height} left={CENTER + BAR_WIDTH * i} />
      ))}
      <View style={[styles.abs, styles.baseline]} />
      <View style={[styles.abs, styles.midLine]} />
      <View style={[styles.abs, styles.tag, styles.midTag]}>
        <Text style={styles.tagText}>62,481.35</Text>
      </View>
      <View style={[styles.abs, styles.tag, styles.wall]}>
        <Text style={[styles.tagText, { color: Palette.marketBuy }]}>Buy wall · 4.5 BTC</Text>
      </View>
      <Text style={[styles.abs, styles.side, { left: 15, color: Palette.marketBuy }]}>BIDS</Text>
      <Text style={[styles.abs, styles.side, { left: 252, color: Palette.marketSell }]}>ASKS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  card: {
    width: 300,
    height: 232,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.borderDefault,
    backgroundColor: Palette.bgSurface,
  },
  baseline: {
    left: -1,
    top: BASELINE,
    width: 300,
    height: 1,
    backgroundColor: Palette.borderDefault,
  },
  midLine: {
    left: CENTER,
    top: 39,
    width: 1,
    height: 150,
    backgroundColor: Palette.borderStrong,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  midTag: { left: 113, top: 13, backgroundColor: Palette.bgRaised },
  wall: { left: 29, top: 72, backgroundColor: Palette.statusLiveBg },
  tagText: {
    fontFamily: DesignFonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.textPrimary,
  },
  side: {
    top: 201,
    fontFamily: DesignFonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
});
