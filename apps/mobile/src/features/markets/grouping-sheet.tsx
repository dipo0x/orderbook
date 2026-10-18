import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';
import { formatGrouping } from '@/core/market/format';

type GroupingSheetProps = {
  visible: boolean;
  options: number[];
  selected: number;
  onSelect: (value: number) => void;
  onClose: () => void;
};

/** Bottom sheet for choosing how finely order book prices are grouped. */
export function GroupingSheet({ visible, options, selected, onSelect, onClose }: GroupingSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/60" />
      <View
        className="rounded-t-2xl bg-raised px-5 pt-2"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="items-center pb-3 pt-1">
          <View className="h-1 w-9 rounded-full bg-line-strong" />
        </View>
        <Text className="pb-3 font-inter-semibold text-[16px] leading-6 text-ink">Price grouping</Text>
        {options.map((value) => {
          const active = value === selected;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(value);
                onClose();
              }}
              className="h-[52px] flex-row items-center justify-between">
              <Text
                className={`font-jetbrains text-[12px] leading-5 ${active ? 'text-accent' : 'text-ink'}`}>
                {formatGrouping(value)}
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
