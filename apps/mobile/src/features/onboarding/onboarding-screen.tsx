import { router } from 'expo-router';
import { type ComponentType, useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageDots } from '@/components/ui/page-dots';
import { PrimaryButton } from '@/components/ui/primary-button';
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
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="h-11 flex-row items-center justify-end pl-4 pr-5">
        {!isLast && (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => void finish()}>
            <Text className="font-inter-medium text-[13px] leading-5 text-ink-muted">Skip</Text>
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
            <View className="flex-1 items-center justify-center">
              <Illustration />
            </View>
            <View className="gap-3 px-6 pb-8">
              <Text className="font-inter-bold text-[28px] leading-[34px] text-ink">{title}</Text>
              <Text className="font-inter text-[15px] leading-[22px] text-ink-muted">{body}</Text>
            </View>
          </View>
        )}
      />

      <View className="items-center gap-6 px-6 pb-2">
        <PageDots count={SLIDES.length} index={index} />
        <PrimaryButton label={isLast ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </View>
  );
}
