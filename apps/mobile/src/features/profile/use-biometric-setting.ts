import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { getBiometricStatus } from '@/core/wallet/biometrics';
import { disableBiometrics, enableBiometrics, getWalletMeta } from '@/core/wallet/storage';
import { requestMnemonic } from '@/features/send/authorize';

/** Whether Face ID unlocks this wallet, and how to turn it on or off. `null` while it loads. */
export function useBiometricSetting() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getWalletMeta().then((meta) => {
        if (!cancelled) setEnabled(meta ? meta.biometric : null);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const toggle = useCallback(async (next: boolean) => {
    if (next) {
      if ((await getBiometricStatus()) !== 'ready') {
        Alert.alert('Face ID is not available', 'Set up Face ID in your iPhone settings first, then try again.');
        return;
      }
      // Turning it on needs the phrase, and the PIN is the way to prove it's you.
      const mnemonic = await requestMnemonic(false);
      if (!mnemonic) return;
      try {
        await enableBiometrics(mnemonic);
        setEnabled(true);
      } catch (error) {
        Alert.alert("Couldn't turn on Face ID", error instanceof Error ? error.message : 'Something went wrong.');
      }
      return;
    }
    Alert.alert('Turn off Face ID?', 'You will unlock the wallet and sign transfers with your PIN instead.', [
      { text: 'Keep it on', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          await disableBiometrics();
          setEnabled(false);
        },
      },
    ]);
  }, []);

  return { enabled, toggle };
}
