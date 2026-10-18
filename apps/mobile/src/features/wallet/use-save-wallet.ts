import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { saveWallet } from '@/core/wallet/storage';

import { useWalletSetup } from './setup-context';

/** Saves the wallet being set up, clears it from memory, and leaves the setup flow. */
export function useSaveWallet() {
  const { mnemonic, biometric, reset } = useWalletSetup();
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!mnemonic || saving) return;
    setSaving(true);
    try {
      await saveWallet({ mnemonic, biometric });
      reset();
      router.replace('/(tabs)/home');
    } catch (error) {
      setSaving(false);
      Alert.alert(
        "Couldn't save your wallet",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  }, [mnemonic, biometric, reset, saving]);

  return { save, saving };
}
