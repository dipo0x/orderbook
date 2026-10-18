import { Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

/** Connection status pill. Only the LIVE variant exists so far. */
export function StatusPill({ label = 'LIVE' }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-live-bg py-1 pl-2 pr-2.5">
      <Image source={require('@/assets/images/onboarding/status-dot.svg')} className="size-1.5" />
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-buy">
        {label}
      </Text>
    </View>
  );
}
