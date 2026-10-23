import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { PIN_LENGTH } from '@/core/wallet/pin-crypto';
import { getPinLockedUntil, getWalletMeta, unlockWithPin } from '@/core/wallet/storage';
import { PinScreen } from '@/features/pin/pin-screen';
import { usePinEntry } from '@/features/pin/use-pin-entry';
import { enterApp } from '@/lib/enter-app';

const WRONG_PIN_RESET_MS = 700;

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** PIN unlock: the fallback when Face ID fails, and the only option if Face ID isn't enabled. */
export function UnlockPinScreen() {
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [wrongAttemptsLeft, setWrongAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);
  // Shows all six dots red for a moment after a wrong PIN, before the entry resets.
  const [flashingWrong, setFlashingWrong] = useState(false);

  useEffect(() => {
    void getWalletMeta().then((meta) => setHasBiometrics(meta?.biometric === true));
    void getPinLockedUntil().then(setLockedUntil);
  }, []);

  // Tick once a second while locked so the countdown updates and the keypad reopens.
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) {
        setLockedUntil(0);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const entry = usePinEntry(async (pin, clear) => {
    setChecking(true);
    try {
      const result = await unlockWithPin(pin);
      if (result.status === 'ok') {
        enterApp();
        return;
      }
      if (result.status === 'locked') {
        setNow(Date.now());
        setLockedUntil(result.until);
        setWrongAttemptsLeft(null);
        clear();
        return;
      }
      setWrongAttemptsLeft(result.attemptsLeft);
      setFlashingWrong(true);
      setTimeout(() => {
        setFlashingWrong(false);
        clear();
      }, WRONG_PIN_RESET_MS);
    } finally {
      setChecking(false);
    }
  });

  const locked = lockedUntil > now;
  const wrong = wrongAttemptsLeft !== null;

  let message: string | undefined;
  if (locked) message = `Too many attempts. Try again in ${formatCountdown(lockedUntil - now)}.`;
  else if (wrong) {
    message = `Wrong PIN. ${wrongAttemptsLeft} ${wrongAttemptsLeft === 1 ? 'attempt' : 'attempts'} left.`;
  } else if (checking) message = 'Unlocking…';
  else if (hasBiometrics) message = 'Use Face ID instead';

  return (
    <PinScreen
      showNavBar={false}
      title="Enter your PIN"
      body={
        hasBiometrics
          ? "Face ID didn't work. Use your 6-digit PIN instead."
          : 'Enter your 6-digit PIN to unlock your wallet.'
      }
      filled={flashingWrong ? PIN_LENGTH : entry.digits.length}
      message={message}
      messageTone={locked || flashingWrong ? 'error' : wrong || checking ? 'muted' : 'link'}
      onMessagePress={
        hasBiometrics && !locked && !wrong && !checking ? () => router.replace('/unlock') : undefined
      }
      keypadDisabled={locked || checking || flashingWrong}
      onDigit={(digit) => {
        setWrongAttemptsLeft(null);
        entry.onDigit(digit);
      }}
      onBackspace={entry.onBackspace}
    />
  );
}
