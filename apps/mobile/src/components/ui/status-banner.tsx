import { Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

type StatusBannerProps = {
  tone: 'warning' | 'danger';
  icon: number;
  children: string;
};

export function StatusBanner({ tone, icon, children }: StatusBannerProps) {
  return (
    <View
      className={`min-h-9 flex-row items-center gap-2 rounded-md border px-3 py-2 ${
        tone === 'warning' ? 'border-accent bg-accent-bg' : 'border-sell bg-sell-bg'
      }`}>
      <Image source={icon} className="size-4" />
      <Text className="flex-1 font-inter text-[13px] leading-5 text-ink">{children}</Text>
    </View>
  );
}
