import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { isWeakPin } from '@/core/wallet/pin-crypto';
import { PinScreen } from '@/features/pin/pin-screen';
import { usePinEntry } from '@/features/pin/use-pin-entry';

import { useWalletSetup } from './setup-context';

export function CreatePinScreen() {
  const { mnemonic, setPin } = useWalletSetup();
  const [error, setError] = useState<string | null>(null);

  const entry = usePinEntry((pin, clear) => {
    if (isWeakPin(pin)) {
      setError('That PIN is too easy to guess. Try another.');
      clear();
      return;
    }
    setPin(pin);
    router.push('/setup/confirm-pin');
    clear();
  });

  if (!mnemonic) return <Redirect href="/setup" />;

  return (
    <PinScreen
      title="Create a PIN"
      body="6 digits. It opens your wallet when Face ID isn't available, and after the phone restarts."
      filled={entry.digits.length}
      message={error ?? 'Avoid 123456 or your birth year.'}
      messageTone={error ? 'error' : 'muted'}
      onBack={() => router.back()}
      onDigit={(digit) => {
        setError(null);
        entry.onDigit(digit);
      }}
      onBackspace={entry.onBackspace}
    />
  );
}
