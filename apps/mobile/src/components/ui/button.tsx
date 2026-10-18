import { Pressable, Text } from 'react-native';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-[52px] items-center justify-center self-stretch rounded-xl active:opacity-85 ${
        isPrimary ? 'bg-accent' : 'border border-line-strong'
      } ${disabled ? 'opacity-40' : ''}`}>
      <Text
        className={`font-inter-semibold text-[16px] leading-6 ${isPrimary ? 'text-canvas' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
