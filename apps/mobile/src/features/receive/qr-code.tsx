import { encode } from 'uqr';
import { useMemo } from 'react';
import { View } from 'react-native';

/** A QR code drawn from plain views: each row's dark modules are merged into runs. */
export function QrCode({ value, size = 188 }: { value: string; size?: number }) {
  const runs = useMemo(() => {
    const { data } = encode(value, { ecc: 'M', border: 0 });
    const rows: { x: number; length: number }[][] = data.map((row) => {
      const found: { x: number; length: number }[] = [];
      row.forEach((dark, x) => {
        if (!dark) return;
        const last = found[found.length - 1];
        if (last && last.x + last.length === x) last.length += 1;
        else found.push({ x, length: 1 });
      });
      return found;
    });
    return { rows, modules: data.length };
  }, [value]);

  const module = size / runs.modules;

  return (
    <View
      accessibilityLabel="QR code of your wallet address"
      className="items-center justify-center rounded-xl bg-white"
      style={{ width: size + 32, height: size + 32 }}>
      <View style={{ width: size, height: size }}>
        {runs.rows.map((row, y) =>
          row.map((run) => (
            <View
              key={`${y}-${run.x}`}
              className="absolute bg-black"
              style={{ left: run.x * module, top: y * module, width: run.length * module, height: module + 0.5 }}
            />
          )),
        )}
      </View>
    </View>
  );
}
