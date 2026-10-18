import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/design';

type PageDotsProps = {
  count: number;
  index: number;
};

export function PageDots({ count, index }: PageDotsProps) {
  return (
    <View style={styles.row} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.borderStrong,
  },
  active: {
    width: 20,
    backgroundColor: Palette.accent,
  },
});
