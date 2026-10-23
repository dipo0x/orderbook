import { Alert } from 'react-native';

import { OptionSheet } from '@/components/ui/option-sheet';
import type { Cluster } from '@/core/solana/config';
import { setCluster, useNetwork } from '@/core/solana/network';

const OPTIONS: { value: Cluster; label: string }[] = [
  { value: 'mainnet-beta', label: 'Mainnet Beta' },
  { value: 'devnet', label: 'Devnet' },
  { value: 'testnet', label: 'Testnet' },
];

/** Picks which Solana network the wallet reads and sends on. Mainnet asks first: it's real money. */
export function NetworkSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { cluster } = useNetwork();

  function choose(next: Cluster) {
    if (next !== 'mainnet-beta') {
      setCluster(next);
      return;
    }
    // Let the sheet finish closing before the alert appears.
    setTimeout(
      () =>
        Alert.alert(
          'Switch to mainnet?',
          "Mainnet uses real money. Transfers can't be undone, and this app is still being built, so only use small amounts.",
          [
            { text: 'Stay here', style: 'cancel' },
            { text: 'Use mainnet', style: 'destructive', onPress: () => setCluster('mainnet-beta') },
          ],
        ),
      300,
    );
  }

  return (
    <OptionSheet title="Network" visible={visible} options={OPTIONS} selected={cluster} onSelect={choose} onClose={onClose} />
  );
}
