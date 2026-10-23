import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { PIN_LENGTH } from '@/core/wallet/pin-crypto';
import { getPinLockedUntil, unlockWithPin } from '@/core/wallet/storage';
import { PinScreen } from '@/features/pin/pin-screen';
import { usePinEntry } from '@/features/pin/use-pin-entry';

import { resolveAuthorization } from './authorize';

const WRONG_PIN_RESET_MS = 700;

/** PIN prompt shown when a wallet without Face ID needs to sign something. */
export function AuthorizePinScreen() {
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [flashingWrong, setFlashingWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const settled = useRef(false);

  // Lock state is kept as a flag that clears itself when the lockout ends.
  const [locked, setLocked] = useState(false);
  const applyLock = (until: number) => {
    const remaining = until - Date.now();
    if (remaining <= 0) return;
    setLocked(true);
    setTimeout(() => setLocked(false), remaining);
  };

  useEffect(() => {
    void getPinLockedUntil().then((until) => {
      const remaining = until - Date.now();
      if (remaining > 0) {
        setLocked(true);
        setTimeout(() => setLocked(false), remaining);
      }
    });
    // Leaving without entering a PIN counts as cancelling.
    return () => {
      if (!settled.current) resolveAuthorization(null);
    };
  }, []);

  const entry = usePinEntry(async (pin, clear) => {
    setChecking(true);
    try {
      const result = await unlockWithPin(pin);
      if (result.status === 'ok') {
        settled.current = true;
        resolveAuthorization(result.mnemonic);
        router.back();
        return;
      }
      if (result.status === 'locked') {
        applyLock(result.until);
        clear();
        return;
      }
      setAttemptsLeft(result.attemptsLeft);
      setFlashingWrong(true);
      setTimeout(() => {
        setFlashingWrong(false);
        clear();
      }, WRONG_PIN_RESET_MS);
    } finally {
      setChecking(false);
    }
  });

  let message: string | undefined;
  if (locked) message = 'Too many attempts. Try again in a little while.';
  else if (checking) message = 'Checking…';
  else if (attemptsLeft !== null) {
    message = `Wrong PIN. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`;
  }

  return (
    <PinScreen
      title="Confirm with PIN"
      body="Enter your 6-digit PIN to sign this transaction."
      filled={flashingWrong ? PIN_LENGTH : entry.digits.length}
      message={message}
      messageTone={locked || flashingWrong ? 'error' : 'muted'}
      onBack={() => router.back()}
      keypadDisabled={locked || checking || flashingWrong}
      onDigit={(digit) => {
        setAttemptsLeft(null);
        entry.onDigit(digit);
      }}
      onBackspace={entry.onBackspace}
    />
  );
}
