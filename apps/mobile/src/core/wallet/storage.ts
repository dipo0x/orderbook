import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytesAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { SOLANA_DERIVATION_PATH, deriveSolanaAccount } from './derive';
import { normalizeMnemonic } from './mnemonic';
import { type WrappedSecret, unwrapWithPin, wrapWithPin } from './pin-crypto';

// The recovery phrase is stored once per unlock method: one copy behind Face ID in the keychain,
// and one encrypted with a key derived from the PIN. Either method alone can open the wallet.
const BIOMETRIC_KEY = 'orderbook.wallet.mnemonic.bio.v2';
const PIN_KEY = 'orderbook.wallet.mnemonic.pin.v2';
const ATTEMPTS_KEY = 'orderbook.wallet.pin-attempts.v2';
const META_KEY = 'orderbook:wallet-meta:v2';

export const MAX_PIN_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 60_000;
const MAX_LOCKOUT_MS = 60 * 60_000;

/** Non-secret wallet details. The recovery phrase itself only ever lives in the keychain. */
export type WalletMeta = {
  address: string;
  derivationPath: string;
  /** Whether Face ID is enabled. A PIN always exists. */
  biometric: boolean;
  createdAt: number;
};

export async function getWalletMeta(): Promise<WalletMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as WalletMeta) : null;
  } catch {
    return null;
  }
}

/**
 * Encrypts the recovery phrase on this device and records the public address.
 * Refuses to overwrite an existing wallet: call deleteWallet() first, on purpose.
 */
export async function saveWallet(params: {
  mnemonic: string;
  pin: string;
  biometric: boolean;
}): Promise<WalletMeta> {
  if (await getWalletMeta()) throw new Error('A wallet already exists on this device.');

  const mnemonic = normalizeMnemonic(params.mnemonic);
  const account = await deriveSolanaAccount(mnemonic);
  account.privateKey.fill(0);
  const wrapped = await wrapWithPin(mnemonic, params.pin, getRandomBytesAsync);

  try {
    if (params.biometric) {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, mnemonic, {
        requireAuthentication: true,
        authenticationPrompt: 'Unlock your wallet',
        keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });
    }
    await SecureStore.setItemAsync(PIN_KEY, JSON.stringify(wrapped), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await writeAttempts(NO_ATTEMPTS);

    const meta: WalletMeta = {
      address: account.address,
      derivationPath: SOLANA_DERIVATION_PATH,
      biometric: params.biometric,
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
    return meta;
  } catch (error) {
    await deleteWallet();
    throw error;
  }
}

/** Reads the recovery phrase behind Face ID. Shows the system prompt. */
export async function readMnemonicWithBiometrics(prompt: string): Promise<string | null> {
  const meta = await getWalletMeta();
  if (!meta?.biometric) return null;
  return SecureStore.getItemAsync(BIOMETRIC_KEY, {
    requireAuthentication: true,
    authenticationPrompt: prompt,
  });
}

type Attempts = { failed: number; lockLevel: number; lockedUntil: number };
const NO_ATTEMPTS: Attempts = { failed: 0, lockLevel: 0, lockedUntil: 0 };

async function readAttempts(): Promise<Attempts> {
  try {
    const raw = await SecureStore.getItemAsync(ATTEMPTS_KEY);
    return raw ? { ...NO_ATTEMPTS, ...(JSON.parse(raw) as Attempts) } : NO_ATTEMPTS;
  } catch {
    return NO_ATTEMPTS;
  }
}

function writeAttempts(attempts: Attempts) {
  return SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify(attempts), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Epoch ms until which PIN entry is locked, or 0 if it is open. */
export async function getPinLockedUntil(): Promise<number> {
  const { lockedUntil } = await readAttempts();
  return lockedUntil > Date.now() ? lockedUntil : 0;
}

export type PinUnlockResult =
  | { status: 'ok'; mnemonic: string }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'locked'; until: number };

/**
 * Tries a PIN. Failures are counted before the check runs, so killing the app mid-check
 * can't be used to avoid being counted. After MAX_PIN_ATTEMPTS misses the PIN locks for
 * 1 minute, doubling each round up to 1 hour. Nothing is ever deleted.
 */
export async function unlockWithPin(pin: string): Promise<PinUnlockResult> {
  const attempts = await readAttempts();
  const now = Date.now();
  if (attempts.lockedUntil > now) return { status: 'locked', until: attempts.lockedUntil };

  const raw = await SecureStore.getItemAsync(PIN_KEY);
  if (!raw) throw new Error('No wallet on this device.');

  const failed = attempts.failed + 1;
  await writeAttempts({ ...attempts, failed, lockedUntil: 0 });

  const mnemonic = await unwrapWithPin(JSON.parse(raw) as WrappedSecret, pin);
  if (mnemonic !== null) {
    await writeAttempts(NO_ATTEMPTS);
    return { status: 'ok', mnemonic };
  }

  if (failed >= MAX_PIN_ATTEMPTS) {
    const lockLevel = attempts.lockLevel + 1;
    const lockedUntil = now + Math.min(BASE_LOCKOUT_MS * 2 ** (lockLevel - 1), MAX_LOCKOUT_MS);
    await writeAttempts({ failed: 0, lockLevel, lockedUntil });
    return { status: 'locked', until: lockedUntil };
  }
  return { status: 'wrong', attemptsLeft: MAX_PIN_ATTEMPTS - failed };
}

export async function deleteWallet(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_KEY),
    SecureStore.deleteItemAsync(PIN_KEY),
    SecureStore.deleteItemAsync(ATTEMPTS_KEY),
    AsyncStorage.removeItem(META_KEY),
  ]);
}
