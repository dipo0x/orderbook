import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { SettingsRow } from '@/components/ui/settings-row';
import { shortAddress } from '@/core/solana/address';
import { explorerAddressUrl } from '@/core/solana/config';
import { useNetwork } from '@/core/solana/network';
import { useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { WalletScreen } from '@/features/wallet/wallet-screen';

import { NetworkSheet } from './network-sheet';

function Group({ label }: { label: string }) {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function WalletKeysScreen() {
  const meta = useWalletMeta();
  const { cluster, label } = useNetwork();
  const [copied, setCopied] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyAddress() {
    if (!meta) return;
    await Clipboard.setStringAsync(meta.address);
    setCopied(true);
  }

  return (
    <>
      <WalletScreen title="Wallet & keys" onBack={() => router.back()} gap={4}>
        <View className="-mx-6">
          <Group label="WALLET" />
          <SettingsRow
            label="Address"
            icon={require('@/assets/images/profile/icon-wallet.svg')}
            value={copied ? 'Copied' : meta ? shortAddress(meta.address) : '—'}
            onPress={() => void copyAddress()}
          />
          <SettingsRow
            label="Network"
            icon={require('@/assets/images/profile/icon-globe.svg')}
            value={label}
            onPress={() => setNetworkOpen(true)}
          />
          <SettingsRow
            label="Derivation path"
            icon={require('@/assets/images/profile/icon-key.svg')}
            value={meta?.derivationPath}
            onPress={() =>
              Alert.alert(
                'Derivation path',
                `${meta?.derivationPath ?? ''} is the standard Solana path. Wallets like Phantom and Solflare use it too, so the same 12 words give the same address there.`,
              )
            }
          />

          <Group label="ACTIONS" />
          <SettingsRow
            label="Copy address"
            icon={require('@/assets/images/wallet/icon-copy-muted.svg')}
            onPress={() => void copyAddress()}
          />
          <SettingsRow
            label="Show QR code"
            icon={require('@/assets/images/profile/icon-qr.svg')}
            onPress={() => router.push('/receive')}
          />
          <SettingsRow
            label="View on explorer"
            icon={require('@/assets/images/profile/icon-external.svg')}
            onPress={meta ? () => void Linking.openURL(explorerAddressUrl(meta.address, cluster)) : undefined}
          />

          <Group label="BACKUP" />
          <SettingsRow
            label="View recovery phrase"
            icon={require('@/assets/images/profile/icon-eye.svg')}
            onPress={() => router.push('/recovery-phrase')}
          />
          <SettingsRow
            label="Export private key"
            icon={require('@/assets/images/profile/icon-key.svg')}
            onPress={() => router.push('/export-key')}
          />
        </View>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
          Both need Face ID or your PIN and block screenshots. Never paste a phrase or key into a website.
        </Text>
      </WalletScreen>
      <NetworkSheet visible={networkOpen} onClose={() => setNetworkOpen(false)} />
    </>
  );
}
