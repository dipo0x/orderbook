import { Stack } from 'expo-router';

import { WalletSetupProvider } from '@/features/wallet/setup-context';

export default function WalletLayout() {
  return (
    <WalletSetupProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </WalletSetupProvider>
  );
}
