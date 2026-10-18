import Constants from 'expo-constants';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/ui/logo-mark';

export function SplashView() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      {/* The Figma glow is a blurred circle; a soft box shadow gives the same falloff natively. */}
      <View
        className="absolute size-[300px] rounded-full bg-glow"
        style={{ boxShadow: '0 0 100px 0 rgba(240,185,11,0.07)' }}
      />
      <View className="items-center gap-5">
        <LogoMark />
        <View className="items-center gap-1.5">
          <Text className="font-inter-bold text-[30px] leading-9 text-ink">orderbook</Text>
          <Text className="font-inter text-[13px] leading-5 text-ink-muted">
            Live crypto order books
          </Text>
        </View>
      </View>
      <View className="absolute items-center gap-1" style={{ bottom: insets.bottom + 32 }}>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
          Market data from OKX
        </Text>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
          v{Constants.expoConfig?.version}
        </Text>
      </View>
    </View>
  );
}
