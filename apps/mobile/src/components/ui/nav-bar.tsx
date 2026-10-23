import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

type NavBarProps = {
  onBack?: () => void;
  right?: ReactNode;
  title?: string;
};

export function NavBar({ onBack, right, title }: NavBarProps) {
  return (
    <View className="h-11 flex-row items-center gap-3 pl-1 pr-4">
      {onBack ? (
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={onBack}
          className="size-11 items-center justify-center">
          <Image source={require('@/assets/images/wallet/icon-chevron-left.svg')} className="size-5" />
        </Pressable>
      ) : (
        <View className="size-11" />
      )}
      {title ? (
        <Text className="flex-1 font-inter-semibold text-[16px] leading-6 text-ink">{title}</Text>
      ) : (
        <View className="flex-1" />
      )}
      {right}
    </View>
  );
}
