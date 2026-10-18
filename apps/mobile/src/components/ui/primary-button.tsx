import { Pressable, Text } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
};

export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-[52px] items-center justify-center self-stretch rounded-xl bg-accent active:opacity-85">
      <Text className="font-inter-semibold text-[16px] leading-6 text-canvas">{label}</Text>
    </Pressable>
  );
}
