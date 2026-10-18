import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SOLANA_DERIVATION_PATH, deriveSolanaAccount } from './derive';
import { normalizeMnemonic } from './mnemonic';

const MNEMONIC_KEY = 'orderbook.wallet.mnemonic.v1';
const META_KEY = 'orderbook:wallet-meta:v1';

/** Non-secret wallet details. The recovery phrase itself lives only in the keychain. */
export type WalletMeta = {
  address: string;
  derivationPath: string;
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
 * Encrypts the recovery phrase in the device keychain and records the public address.
 * Refuses to overwrite an existing wallet: call deleteWallet() first, on purpose.
 */
export async function saveWallet(params: {
  mnemonic: string;
  biometric: boolean;
}): Promise<WalletMeta> {
  if (await getWalletMeta()) throw new Error('A wallet already exists on this device.');

  const mnemonic = normalizeMnemonic(params.mnemonic);
  const account = await deriveSolanaAccount(mnemonic);
  account.privateKey.fill(0);

  await SecureStore.setItemAsync(MNEMONIC_KEY, mnemonic, {
    requireAuthentication: params.biometric,
    authenticationPrompt: 'Unlock your wallet',
    keychainAccessible: params.biometric
      ? SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
      : SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  const meta: WalletMeta = {
    address: account.address,
    derivationPath: SOLANA_DERIVATION_PATH,
    biometric: params.biometric,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  return meta;
}

/** Reads the recovery phrase. Shows the biometric prompt when the wallet is biometric-protected. */
export async function readMnemonic(prompt: string): Promise<string | null> {
  const meta = await getWalletMeta();
  if (!meta) return null;
  return SecureStore.getItemAsync(MNEMONIC_KEY, {
    requireAuthentication: meta.biometric,
    authenticationPrompt: prompt,
  });
}

export async function deleteWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(MNEMONIC_KEY);
  await AsyncStorage.removeItem(META_KEY);
}
