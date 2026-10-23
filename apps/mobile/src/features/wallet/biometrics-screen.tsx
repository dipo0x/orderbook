import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { authenticate, getBiometricStatus } from '@/core/wallet/biometrics';

import { useWalletSetup } from './setup-context';
import { WalletScreen } from './wallet-screen';

const FEATURES = [
  { label: 'Required to send or swap', icon: require('@/assets/images/wallet/icon-lock.svg') },
  {
    label: 'Required to view your recovery phrase',
    icon: require('@/assets/images/wallet/icon-shield.svg'),
  },
  { label: 'Falls back to a 6-digit PIN', icon: require('@/assets/images/wallet/icon-key-green.svg') },
];

export function BiometricsScreen() {
  const { mnemonic, setBiometric } = useWalletSetup();
  const [busy, setBusy] = useState(false);

  if (!mnemonic) return <Redirect href="/setup" />;

  // A PIN is always created next: it is the fallback when Face ID isn't available.
  function continueToPin(biometric: boolean) {
    setBiometric(biometric);
    router.push('/setup/create-pin');
  }

  async function enable() {
    setBusy(true);
    try {
      const status = await getBiometricStatus();
      if (status !== 'ready') {
        Alert.alert(
          "Face ID isn't available",
          status === 'not-enrolled'
            ? 'Face ID or Touch ID is not set up on this phone. You can set it up in Settings, or use a PIN.'
            : "This phone doesn't support Face ID or Touch ID. You can use a PIN instead.",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use a PIN', onPress: () => continueToPin(false) },
          ],
        );
        return;
      }
      if (await authenticate('Enable Face ID for your wallet')) continueToPin(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <WalletScreen
      gap={6}
      onBack={() => router.back()}
      footer={
        <>
          <Button label="Enable Face ID" onPress={() => void enable()} disabled={busy} />
          <Button
            variant="secondary"
            label="Use a 6-digit PIN instead"
            disabled={busy}
            onPress={() => continueToPin(false)}
          />
        </>
      }>
      <ScreenHeading
        title="Lock it with Face ID"
        body="Your recovery phrase is encrypted in the device keychain. Face ID unlocks it when you send — nothing leaves the phone."
      />
      <View className="items-center justify-center py-6">
        <View className="size-[132px] items-center justify-center rounded-full border-2 border-accent bg-raised">
          <Image source={require('@/assets/images/wallet/icon-face-id.svg')} className="size-14" />
        </View>
      </View>
      <View className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {FEATURES.map(({ label, icon }, i) => (
          <View
            key={label}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${i < FEATURES.length - 1 ? 'border-b border-line' : ''}`}>
            <Image source={icon} className="size-4" />
            <Text className="font-inter text-[13px] leading-5 text-ink">{label}</Text>
          </View>
        ))}
      </View>
    </WalletScreen>
  );
}
