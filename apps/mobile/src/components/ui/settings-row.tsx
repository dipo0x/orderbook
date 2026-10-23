import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

type SettingsRowProps = {
  label: string;
  icon: number;
  /** Text on the right, before the chevron (e.g. the current setting). */
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  /** Red label, for actions that destroy something. */
  destructive?: boolean;
};

export function SettingsRow({ label, icon, value, onPress, trailing, destructive }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      className={`h-[52px] flex-row items-center gap-3 border-b border-line px-4 active:bg-surface`}>
      <View className="size-8 items-center justify-center rounded-lg bg-raised">
        <Image source={icon} className="size-4" />
      </View>
      <Text className={`flex-1 font-inter text-[13px] leading-5 ${destructive ? 'text-sell' : 'text-ink'}`}>{label}</Text>
      {value ? (
        <Text className="font-inter text-[13px] leading-5 text-ink-muted">{value}</Text>
      ) : null}
      {trailing ?? (
        <Image source={require('@/assets/images/wallet/icon-chevron-right.svg')} className="size-4" />
      )}
    </Pressable>
  );
}
