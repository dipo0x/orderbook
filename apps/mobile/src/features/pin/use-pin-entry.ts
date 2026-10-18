import { useCallback, useState } from 'react';

import { PIN_LENGTH } from '@/core/wallet/pin-crypto';

/**
 * Collects digits for a PIN screen. `onComplete` fires once, when the last digit is entered,
 * and receives a `clear` function for starting over.
 */
export function usePinEntry(onComplete: (pin: string, clear: () => void) => void) {
  const [digits, setDigits] = useState('');

  const clear = useCallback(() => setDigits(''), []);
  const onDigit = useCallback(
    (digit: string) => {
      if (digits.length >= PIN_LENGTH) return;
      const next = digits + digit;
      setDigits(next);
      if (next.length === PIN_LENGTH) onComplete(next, clear);
    },
    [digits, onComplete, clear],
  );
  const onBackspace = useCallback(() => setDigits((prev) => prev.slice(0, -1)), []);

  return { digits, onDigit, onBackspace, clear };
}
