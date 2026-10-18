import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Image } from '@/components/ui/image';

type NavBarProps = {
  onBack?: () => void;
  right?: ReactNode;
};

export function NavBar({ onBack, right }: NavBarProps) {
  return (
    <View className="h-11 flex-row items-center justify-between pl-1 pr-4">
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
      {right}
    </View>
  );
}
