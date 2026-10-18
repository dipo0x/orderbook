import { getRandomBytesAsync } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { LogoMark } from '@/components/ui/logo-mark';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { mnemonicFromEntropy } from '@/core/wallet/mnemonic';
import { skipWalletSetup } from '@/lib/onboarding-storage';

import { useWalletSetup } from './setup-context';
import { WalletScreen } from './wallet-screen';

type OptionCardProps = {
  title: string;
  subtitle: string;
  icon: number;
  highlighted?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function OptionCard({ title, subtitle, icon, highlighted, disabled, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-3.5 rounded-[14px] border bg-surface px-4 py-[18px] active:opacity-85 ${
        highlighted ? 'border-accent' : 'border-line'
      }`}>
      <View
        className={`size-11 items-center justify-center rounded-xl ${highlighted ? 'bg-accent' : 'bg-raised'}`}>
        <Image source={icon} className="size-5" />
      </View>
      <View className="flex-1 gap-[3px]">
        <Text className="font-inter-medium text-[13px] leading-5 text-ink">{title}</Text>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">{subtitle}</Text>
      </View>
      <Image source={require('@/assets/images/wallet/icon-chevron-right.svg')} className="size-4" />
    </Pressable>
  );
}

/** This screen is the stack root after onboarding, so there is no history; go back to the last slide. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace({ pathname: '/onboarding', params: { slide: '2' } });
}

export function CreateOrImportScreen() {
  const { start } = useWalletSetup();
  const [busy, setBusy] = useState(false);

  async function createWallet() {
    setBusy(true);
    try {
      const entropy = await getRandomBytesAsync(16);
      const mnemonic = mnemonicFromEntropy(entropy);
      entropy.fill(0);
      start('create', mnemonic);
      router.push('/wallet/biometrics');
    } catch {
      Alert.alert("Couldn't create a wallet", 'Secure random numbers are unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WalletScreen
      gap={6}
      onBack={goBack}
      right={
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={async () => {
            await skipWalletSetup();
            router.replace('/(tabs)/home');
          }}>
          <Text className="font-inter-medium text-[13px] leading-5 text-ink-muted">Skip</Text>
        </Pressable>
      }>
      <LogoMark size={48} />
      <ScreenHeading
        title="Set up your wallet"
        body="Create a wallet to hold assets, or bring one you already use. Browsing markets works without either."
      />
      <View className="gap-3">
        <OptionCard
          highlighted
          disabled={busy}
          title="Create a new wallet"
          subtitle="Generates a 12-word recovery phrase on this device."
          icon={require('@/assets/images/wallet/icon-key-dark.svg')}
          onPress={() => void createWallet()}
        />
        <OptionCard
          title="Import an existing wallet"
          subtitle="Restore from a recovery phrase or a private key."
          icon={require('@/assets/images/wallet/icon-download.svg')}
          onPress={() => router.push('/wallet/import')}
        />
      </View>
      <Callout tone="info">
        Keys are generated and stored on this device only. There is no account, no server and no way
        for anyone to recover your wallet for you.
      </Callout>
    </WalletScreen>
  );
}
