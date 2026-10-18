import { Pressable, Text, View } from 'react-native';

type SeedWordChipProps = {
  index: number;
  word?: string;
  /** `blank` is an empty slot to fill, `active` is the slot currently being filled. */
  state?: 'filled' | 'blank' | 'active';
  onPress?: () => void;
};

const FRAME: Record<NonNullable<SeedWordChipProps['state']>, string> = {
  filled: 'border-line bg-surface',
  blank: 'border-dashed border-line-strong bg-surface',
  active: 'border-accent bg-hover',
};

export function SeedWordChip({ index, word, state = 'filled', onPress }: SeedWordChipProps) {
  const content = (
    <>
      <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">{index}</Text>
      <Text className="font-jetbrains-medium text-[12px] leading-5 text-ink">{word}</Text>
    </>
  );
  const className = `h-10 w-full flex-row items-center gap-2 rounded-lg border px-2.5 ${FRAME[state]}`;

  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} className={className}>
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}
