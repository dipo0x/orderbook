import { Text, View } from 'react-native';

export function ScreenHeading({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-2">
      <Text className="font-inter-bold text-[26px] leading-8 text-ink">{title}</Text>
      <Text className="font-inter text-[15px] leading-[22px] text-ink-muted">{body}</Text>
    </View>
  );
}
