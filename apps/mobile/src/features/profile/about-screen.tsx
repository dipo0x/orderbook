import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { SettingsRow } from '@/components/ui/settings-row';
import { useNetwork } from '@/core/solana/network';
import { WalletScreen } from '@/features/wallet/wallet-screen';

import { NetworkSheet } from './network-sheet';

const REPO_URL = 'https://github.com/dipo0x/orderbook';

function Group({ label }: { label: string }) {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function AboutScreen() {
  const { label } = useNetwork();
  const [networkOpen, setNetworkOpen] = useState(false);
  const build = Constants.expoConfig?.ios?.buildNumber;
  const version = Constants.expoConfig?.version ?? '—';
  const info = require('@/assets/images/profile/icon-info.svg');

  return (
    <>
    <WalletScreen title="About" onBack={() => router.back()} gap={4}>
      <View className="-mx-6">
        <Group label="APP" />
        <SettingsRow label="Version" icon={info} value={build ? `${version} (build ${build})` : version} trailing={<View />} />
        <SettingsRow
          label="Network"
          icon={require('@/assets/images/profile/icon-globe.svg')}
          value={label}
          onPress={() => setNetworkOpen(true)}
        />
        <Group label="LEGAL" />
        <SettingsRow label="Open source licences" icon={info} onPress={() => router.push('/licences')} />
        <SettingsRow label="Terms of use" icon={info} onPress={() => router.push('/terms')} />
        <SettingsRow
          label="Privacy policy"
          icon={require('@/assets/images/wallet/icon-lock.svg')}
          onPress={() => router.push('/privacy')}
        />
        <Group label="LINKS" />
        <SettingsRow
          label="Source code"
          icon={require('@/assets/images/profile/icon-external.svg')}
          onPress={() => void Linking.openURL(REPO_URL)}
        />
        <SettingsRow
          label="Report a problem"
          icon={require('@/assets/images/profile/icon-warning.svg')}
          onPress={() => void Linking.openURL(`${REPO_URL}/issues/new`)}
        />
      </View>
    </WalletScreen>
    <NetworkSheet visible={networkOpen} onClose={() => setNetworkOpen(false)} />
    </>
  );
}
