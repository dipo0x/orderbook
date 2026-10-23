import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { PinScreen } from '@/features/pin/pin-screen';
import { usePinEntry } from '@/features/pin/use-pin-entry';

import { useWalletSetup } from './setup-context';
import { useSaveWallet } from './use-save-wallet';

export function ConfirmPinScreen() {
  const { mnemonic, pin, source } = useWalletSetup();
  const { save, saving } = useSaveWallet();
  const [error, setError] = useState<string | null>(null);

  const entry = usePinEntry((entered, clear) => {
    if (entered !== pin) {
      setError("The PINs don't match. Try again.");
      clear();
      return;
    }
    // Creating shows the phrase to back up next. Importing has nothing left to show, so it saves now.
    if (source === 'create') router.push('/setup/recovery-phrase');
    else void save();
  });

  if (!mnemonic || !pin) return <Redirect href="/setup" />;

  return (
    <PinScreen
      title="Confirm your PIN"
      body="Enter the same 6 digits again."
      filled={entry.digits.length}
      message={error ?? "Don't forget it. It can't be reset without your recovery phrase."}
      messageTone={error ? 'error' : 'muted'}
      onBack={() => router.back()}
      keypadDisabled={saving}
      onDigit={(digit) => {
        setError(null);
        entry.onDigit(digit);
      }}
      onBackspace={entry.onBackspace}
    />
  );
}
