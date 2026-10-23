import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { deriveSolanaAccount } from '@/core/wallet/derive';
import { isWeakPin } from '@/core/wallet/pin-crypto';
import { changePin, getWalletMeta, readMnemonicWithBiometrics, unlockWithPin } from '@/core/wallet/storage';
import { PinScreen } from '@/features/pin/pin-screen';
import { usePinEntry } from '@/features/pin/use-pin-entry';

type Step = 'current' | 'new' | 'confirm';

/** Change PIN: prove the current one (or Face ID), then choose and confirm a new one. */
export function ChangePinScreen() {
  const [step, setStep] = useState<Step>('current');
  // The phrase is held only while this screen is open, to re-encrypt it under the new PIN.
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    void getWalletMeta().then((meta) => setHasBiometrics(meta?.biometric === true));
  }, []);

  const entry = usePinEntry(async (pin, clear) => {
    setError(false);
    if (step === 'current') {
      setBusy(true);
      try {
        const result = await unlockWithPin(pin);
        if (result.status === 'ok') {
          setMnemonic(result.mnemonic);
          setMessage(null);
          setStep('new');
        } else {
          setError(true);
          setMessage(
            result.status === 'locked'
              ? 'Too many attempts. Try again in a little while.'
              : `Wrong PIN. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`,
          );
        }
      } finally {
        setBusy(false);
        clear();
      }
      return;
    }
    if (step === 'new') {
      if (isWeakPin(pin)) {
        setError(true);
        setMessage('That PIN is too easy to guess. Try another.');
      } else {
        setNewPin(pin);
        setMessage(null);
        setStep('confirm');
      }
      clear();
      return;
    }
    if (pin !== newPin) {
      setError(true);
      setMessage("The PINs don't match. Try again.");
      clear();
      return;
    }
    setBusy(true);
    try {
      // Never re-encrypt a phrase that isn't this wallet's: that would overwrite the good copy.
      const meta = await getWalletMeta();
      const account = await deriveSolanaAccount(mnemonic!);
      const matches = account.address === meta?.address;
      account.privateKey.fill(0);
      if (!matches) throw new Error('mismatch');
      await changePin(mnemonic!, pin);
      setMnemonic(null);
      Alert.alert('PIN changed', 'Use your new PIN from now on.');
      router.back();
    } catch {
      setError(true);
      setMessage("Couldn't save the new PIN. Your old PIN still works.");
      clear();
    } finally {
      setBusy(false);
    }
  });

  async function pressFaceId() {
    if (busy) return;
    setBusy(true);
    try {
      const phrase = await readMnemonicWithBiometrics('Confirm it’s you to change your PIN');
      if (phrase) {
        setMnemonic(phrase);
        setMessage(null);
        setStep('new');
        entry.clear();
      }
    } catch {
      // Cancelled: stay on the PIN step.
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    current: {
      title: 'Enter current PIN',
      body: "Enter your current PIN to set a new one. You'll then create and confirm the new PIN.",
    },
    new: { title: 'Create a new PIN', body: '6 digits. It replaces your current PIN straight away.' },
    confirm: { title: 'Confirm new PIN', body: 'Enter the same 6 digits again.' },
  }[step];

  const link = step === 'current' && hasBiometrics && !message;

  return (
    <PinScreen
      title={copy.title}
      body={copy.body}
      filled={entry.digits.length}
      message={message ?? (link ? 'Forgot your PIN? Use Face ID instead' : step === 'new' ? 'Avoid 123456 or your birth year.' : undefined)}
      messageTone={error ? 'error' : link ? 'link' : 'muted'}
      onMessagePress={link ? () => void pressFaceId() : undefined}
      onBack={() => {
        if (step === 'confirm') {
          setStep('new');
          setMessage(null);
          setError(false);
          entry.clear();
        } else router.back();
      }}
      keypadDisabled={busy}
      onDigit={(digit) => {
        setMessage(null);
        setError(false);
        entry.onDigit(digit);
      }}
      onBackspace={entry.onBackspace}
    />
  );
}
