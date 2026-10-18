import { Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

type CalloutProps = {
  tone: 'danger' | 'info';
  children: string;
};

export function Callout({ tone, children }: CalloutProps) {
  const isDanger = tone === 'danger';

  return (
    <View
      className={`flex-row items-start gap-2.5 rounded-[10px] p-3 ${
        isDanger ? 'border border-sell bg-sell-bg' : 'bg-raised'
      }`}>
      <Image
        source={
          isDanger
            ? require('@/assets/images/wallet/icon-alert.svg')
            : require('@/assets/images/wallet/icon-info.svg')
        }
        className="size-4"
      />
      <Text
        className={`flex-1 font-inter text-[13px] leading-5 ${isDanger ? 'text-ink' : 'text-ink-muted'}`}>
        {children}
      </Text>
    </View>
  );
}
