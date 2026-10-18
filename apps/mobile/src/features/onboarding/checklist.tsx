import { Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

const ITEMS = ['No sign-up or email', 'No API keys to manage', 'Read-only — no funds, no trades'];

export function Checklist() {
  return (
    <View className="w-[300px] overflow-hidden rounded-2xl border border-line bg-surface pb-2">
      <View className="gap-0.5 border-b border-line px-4 py-3.5">
        <Text className="font-inter-medium text-[13px] leading-5 text-ink">Public market data</Text>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">
          wss://ws.okx.com · public channel
        </Text>
      </View>
      {ITEMS.map((label) => (
        <View key={label} className="flex-row items-center gap-3 px-4 py-3">
          <View className="size-7 items-center justify-center rounded-full bg-live-bg">
            <Image source={require('@/assets/images/onboarding/icon-check.svg')} className="size-4" />
          </View>
          <Text className="font-inter text-[13px] leading-5 text-ink">{label}</Text>
        </View>
      ))}
    </View>
  );
}
