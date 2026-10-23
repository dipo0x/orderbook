import { Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

type CalloutProps = {
  tone: 'danger' | 'info' | 'warning';
  children: string;
};

export function Callout({ tone, children }: CalloutProps) {
  const isDanger = tone === 'danger';
  const isWarning = tone === 'warning';
  const frame = isDanger
    ? 'border border-sell bg-sell-bg'
    : isWarning
      ? 'border border-accent bg-accent-bg'
      : 'bg-raised';

  return (
    <View className={`flex-row items-start gap-2.5 rounded-[10px] p-3 ${frame}`}>
      <Image
        source={
          isDanger
            ? require('@/assets/images/wallet/icon-alert.svg')
            : isWarning
              ? require('@/assets/images/portfolio/icon-alert-amber.svg')
              : require('@/assets/images/wallet/icon-info.svg')
        }
        className="size-4"
      />
      <Text
        className={`flex-1 font-inter text-[13px] leading-5 ${isDanger || isWarning ? 'text-ink' : 'text-ink-muted'}`}>
        {children}
      </Text>
    </View>
  );
}
