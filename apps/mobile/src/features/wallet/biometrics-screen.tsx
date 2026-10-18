import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { authenticate, getBiometricStatus } from '@/core/wallet/biometrics';

import { useWalletSetup } from './setup-context';
import { useSaveWallet } from './use-save-wallet';
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
  const { mnemonic, source, setBiometric } = useWalletSetup();
  const { save, saving } = useSaveWallet();
  const [busy, setBusy] = useState(false);

  if (!mnemonic) return <Redirect href="/wallet" />;

  // Creating shows the phrase to back up next. Importing has nothing left to show, so it saves now.
  async function proceed() {
    if (source === 'create') router.push('/wallet/recovery-phrase');
    else await save();
  }

  function continueWithoutBiometrics(reason: string) {
    Alert.alert('Continue without Face ID?', `${reason}\n\nYour wallet will still be encrypted on this device, but anyone who can unlock your phone could open it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: () => {
          setBiometric(false);
          void proceed();
        },
      },
    ]);
  }

  async function enable() {
    setBusy(true);
    try {
      const status = await getBiometricStatus();
      if (status === 'unavailable') {
        continueWithoutBiometrics("This phone doesn't support Face ID or Touch ID.");
        return;
      }
      if (status === 'not-enrolled') {
        continueWithoutBiometrics('Face ID or Touch ID is not set up on this phone.');
        return;
      }
      if (!(await authenticate('Enable Face ID for your wallet'))) return;
      setBiometric(true);
      await proceed();
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
          <Button label="Enable Face ID" onPress={() => void enable()} disabled={busy || saving} />
          <Button
            variant="secondary"
            label="Use a 6-digit PIN instead"
            disabled={busy || saving}
            onPress={() => continueWithoutBiometrics("A PIN option isn't built yet.")}
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
