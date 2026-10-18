import { View } from 'react-native';

type PageDotsProps = {
  count: number;
  index: number;
};

export function PageDots({ count, index }: PageDotsProps) {
  return (
    <View
      accessibilityLabel={`Page ${index + 1} of ${count}`}
      className="flex-row items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          className={
            i === index
              ? 'h-1.5 w-5 rounded-[3px] bg-accent'
              : 'size-1.5 rounded-[3px] bg-line-strong'
          }
        />
      ))}
    </View>
  );
}
