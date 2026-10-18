import { router } from 'expo-router';
import { type ComponentType, useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageDots } from '@/components/ui/page-dots';
import { PrimaryButton } from '@/components/ui/primary-button';
import { DesignFonts, Palette } from '@/constants/design';
import { completeOnboarding } from '@/lib/onboarding-storage';

import { Checklist } from './checklist';
import { DepthChart } from './depth-chart';
import { MiniBook } from './mini-book';

type Slide = {
  key: string;
  Illustration: ComponentType;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    key: 'live',
    Illustration: MiniBook,
    title: 'Watch the market move',
    body: 'Live order books for BTC, ETH and SOL, updated many times a second, straight from the exchange.',
  },
  {
    key: 'depth',
    Illustration: DepthChart,
    title: 'See where buyers and sellers stack up',
    body: 'Depth bars show how much is waiting at each price, so you can spot walls before the price gets there.',
  },
  {
    key: 'no-account',
    Illustration: Checklist,
    title: 'No account. No keys. Just data.',
    body: "Everything comes from OKX's public feed. There's nothing to sign up for, and nothing here can move your money.",
  },
];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = useCallback(async () => {
    await completeOnboarding();
    router.replace('/(tabs)/home');
  }, []);

  const next = useCallback(() => {
    if (isLast) {
      void finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [finish, index, isLast]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        {!isLast && (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => void finish()}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slide) => slide.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item: { Illustration, title, body } }) => (
          <View style={{ width }}>
            <View style={styles.illustration}>
              <Illustration />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <PageDots count={SLIDES.length} index={index} />
        <PrimaryButton label={isLast ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.bgCanvas,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 16,
    paddingRight: 20,
  },
  skip: {
    fontFamily: DesignFonts.sansMedium,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontFamily: DesignFonts.sansBold,
    fontSize: 28,
    lineHeight: 34,
    color: Palette.textPrimary,
  },
  body: {
    fontFamily: DesignFonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.textSecondary,
  },
  footer: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
