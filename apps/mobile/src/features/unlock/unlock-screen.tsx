import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { authenticate } from '@/core/wallet/biometrics';
import { WalletScreen } from '@/features/wallet/wallet-screen';
import { enterApp } from '@/lib/enter-app';

/** Face ID unlock shown when the app opens and a wallet exists. */
export function UnlockScreen() {
  const [busy, setBusy] = useState(false);
  const prompted = useRef(false);

  const unlock = useCallback(async () => {
    setBusy(true);
    try {
      if (await authenticate('Unlock your wallet')) enterApp();
    } finally {
      setBusy(false);
    }
  }, []);

  // Ask for Face ID straight away, once. The button is there if it is cancelled or fails.
  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    void unlock();
  }, [unlock]);

  return (
    <WalletScreen
      gap={6}
      showNavBar={false}
      footer={
        <>
          <Button label="Unlock with Face ID" onPress={() => void unlock()} disabled={busy} />
          <Button
            variant="secondary"
            label="Use PIN instead"
            disabled={busy}
            onPress={() => router.replace('/unlock-pin')}
          />
        </>
      }>
      <ScreenHeading title="Welcome back" body="Use Face ID to unlock your wallet." />
      <View className="items-center justify-center py-6">
        <View className="size-[132px] items-center justify-center rounded-full border-2 border-accent bg-raised">
          <Image source={require('@/assets/images/wallet/icon-face-id.svg')} className="size-14" />
        </View>
      </View>
    </WalletScreen>
  );
}
