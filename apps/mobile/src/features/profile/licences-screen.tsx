import { router } from 'expo-router';
import { Linking, Text, View } from 'react-native';

import { SettingsRow } from '@/components/ui/settings-row';
import { WalletScreen } from '@/features/wallet/wallet-screen';

const LIBRARIES = [
  { name: 'react-native', licence: 'MIT' },
  { name: 'expo', licence: 'MIT' },
  { name: '@solana/web3.js', licence: 'MIT' },
  { name: '@scure/bip39', licence: 'MIT' },
  { name: '@scure/bip32', licence: 'MIT' },
  { name: '@noble/hashes', licence: 'MIT' },
  { name: 'lightweight-charts', licence: 'Apache-2.0' },
];

export function LicencesScreen() {
  return (
    <WalletScreen title="Licences" onBack={() => router.back()} gap={4}>
      <View className="-mx-6">
        <View className="px-4 pb-2 pt-4">
          <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">LIBRARIES</Text>
        </View>
        {LIBRARIES.map(({ name, licence }) => (
          <SettingsRow
            key={name}
            label={name}
            icon={require('@/assets/images/profile/icon-info.svg')}
            value={licence}
            onPress={() => void Linking.openURL(`https://www.npmjs.com/package/${name}`)}
          />
        ))}
      </View>
    </WalletScreen>
  );
}
