import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Stand-in for tabs whose screens aren't built yet. */
export function ComingSoon({ title }: { title: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas px-4" style={{ paddingTop: insets.top + 8 }}>
      <Text className="font-inter-bold text-[30px] leading-9 text-ink">{title}</Text>
      <Text className="pt-2 font-inter text-[15px] leading-[22px] text-ink-muted">Coming soon.</Text>
    </View>
  );
}
