import { Pressable, Text, View } from 'react-native';

import { Image } from '@/components/ui/image';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

type PinKeypadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  /** Optional key for the empty bottom-left slot, e.g. "." on an amount pad. */
  extraKey?: string;
};

const KEY = 'h-14 flex-1 items-center justify-center rounded-[10px] active:bg-raised';

export function PinKeypad({ onDigit, onBackspace, disabled = false, extraKey }: PinKeypadProps) {
  return (
    <View className="gap-1 p-2">
      {ROWS.map((row) => (
        <View key={row[0]} className="flex-row gap-1">
          {row.map((digit) => (
            <Pressable
              key={digit}
              accessibilityRole="button"
              accessibilityLabel={digit}
              disabled={disabled}
              onPress={() => onDigit(digit)}
              className={KEY}>
              <Text className="font-jetbrains-medium text-[24px] leading-8 text-ink">{digit}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <View className="flex-row gap-1">
        {extraKey ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={extraKey === '.' ? 'Decimal point' : extraKey}
            disabled={disabled}
            onPress={() => onDigit(extraKey)}
            className={KEY}>
            <Text className="font-jetbrains-medium text-[24px] leading-8 text-ink">{extraKey}</Text>
          </Pressable>
        ) : (
          <View className="h-14 flex-1" />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="0"
          disabled={disabled}
          onPress={() => onDigit('0')}
          className={KEY}>
          <Text className="font-jetbrains-medium text-[24px] leading-8 text-ink">0</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          disabled={disabled}
          onPress={onBackspace}
          className={KEY}>
          <Image source={require('@/assets/images/pin/icon-backspace.svg')} className="size-[22px]" />
        </Pressable>
      </View>
    </View>
  );
}
