import { View } from 'react-native';

import { Image } from '@/components/ui/image';
import { PIN_LENGTH } from '@/core/wallet/pin-crypto';

type PinDotsProps = {
  /** How many digits have been entered. */
  filled: number;
  /** `error` turns every dot red, as on the wrong-PIN screen. */
  tone?: 'default' | 'error';
};

export function PinDots({ filled, tone = 'default' }: PinDotsProps) {
  const filledSource =
    tone === 'error'
      ? require('@/assets/images/pin/dot-error.svg')
      : require('@/assets/images/pin/dot-filled.svg');

  return (
    <View
      accessibilityLabel={`${filled} of ${PIN_LENGTH} digits entered`}
      className="flex-row items-center justify-center gap-5 pb-3 pt-9">
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <Image
          key={i}
          source={i < filled ? filledSource : require('@/assets/images/pin/dot-empty.svg')}
          className="size-4"
        />
      ))}
    </View>
  );
}
