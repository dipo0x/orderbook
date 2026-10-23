import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';

type OptionSheetProps<T extends string | number> = {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Bottom sheet with a short list of choices and a check beside the current one. */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/60" />
      <View className="rounded-t-2xl bg-raised px-5 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="items-center pb-3 pt-1">
          <View className="h-1 w-9 rounded-full bg-line-strong" />
        </View>
        <Text className="pb-3 font-inter-semibold text-[16px] leading-6 text-ink">{title}</Text>
        {options.map(({ value, label }) => {
          const active = value === selected;
          return (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(value);
                onClose();
              }}
              className="h-[52px] flex-row items-center justify-between">
              <Text className={`font-jetbrains text-[12px] leading-5 ${active ? 'text-accent' : 'text-ink'}`}>
                {label}
              </Text>
              {active ? (
                <Image source={require('@/assets/images/market/icon-check-accent.svg')} className="size-4" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}
