import type { ReactNode } from 'react';
import { View } from 'react-native';

const COLUMNS = 3;

/** Lays chips out in rows of three. `renderChip` receives the zero-based word index. */
export function SeedGrid({
  count,
  renderChip,
}: {
  count: number;
  renderChip: (index: number) => ReactNode;
}) {
  const rows = Array.from({ length: Math.ceil(count / COLUMNS) }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, col) => row * COLUMNS + col).filter((i) => i < count),
  );

  return (
    <View className="w-full max-w-[336px] gap-3 self-center">
      {rows.map((indexes) => (
        <View key={indexes[0]} className="flex-row gap-3">
          {indexes.map((i) => (
            <View key={i} className="flex-1">
              {renderChip(i)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
