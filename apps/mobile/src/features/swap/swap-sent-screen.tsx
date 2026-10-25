import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { explorerTxUrl } from '@/core/solana/config';
import { useNetwork } from '@/core/solana/network';
import { getSignatureStatus } from '@/core/solana/rpc';
import { WalletScreen } from '@/features/wallet/wallet-screen';

const POLL_MS = 1_000;
const GIVE_UP_MS = 60_000;

type Outcome = 'confirming' | 'confirmed' | 'failed' | 'timeout';

/** Result of a swap: waits for the network to confirm before saying it worked. */
export function SwapSentScreen() {
  const { signature, summary } = useLocalSearchParams<{ signature: string; summary: string }>();
  const { cluster } = useNetwork();
  const [outcome, setOutcome] = useState<Outcome>('confirming');

  useEffect(() => {
    const startedAt = Date.now();
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const status = await getSignatureStatus(signature);
        if (cancelled) return;
        if (status?.err) {
          setOutcome('failed');
          clearInterval(timer);
        } else if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          setOutcome('confirmed');
          clearInterval(timer);
        } else if (Date.now() - startedAt > GIVE_UP_MS) {
          setOutcome('timeout');
          clearInterval(timer);
        }
      } catch {
        // A failed poll isn't a failed swap: keep trying until the deadline.
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [signature]);

  const title = { confirming: 'Swapping…', confirmed: 'Swapped', failed: "Didn't go through", timeout: 'Still processing' }[outcome];
  const subtitle = {
    confirming: 'Waiting for the network to confirm…',
    confirmed: 'Your balances will update in a moment.',
    failed: 'The network rejected the swap. Nothing was exchanged; only a small fee may have been charged.',
    timeout: 'It may still confirm. Check the signature on Solscan.',
  }[outcome];

  return (
    <WalletScreen
      gap={6}
      showNavBar={false}
      footer={
        <>
          <Button label="Done" onPress={() => router.navigate('/(tabs)/wallet')} />
          <Button
            label="View on Solscan"
            variant="secondary"
            onPress={() => void Linking.openURL(explorerTxUrl(signature, cluster))}
          />
        </>
      }>
      <View className="items-center gap-3 pt-16">
        <View className={`size-16 items-center justify-center rounded-full ${outcome === 'failed' ? 'bg-sell-bg' : 'bg-live-bg'}`}>
          <Image
            source={
              outcome === 'failed'
                ? require('@/assets/images/portfolio/icon-x-red.svg')
                : require('@/assets/images/portfolio/icon-check-green.svg')
            }
            className="size-7"
          />
        </View>
        <Text className="font-inter-bold text-[26px] leading-8 text-ink">{title}</Text>
        <Text className="font-jetbrains-medium text-[15px] leading-6 text-ink">{summary}</Text>
        <Text className="px-4 text-center font-inter text-[13px] leading-5 text-ink-muted">{subtitle}</Text>
      </View>
    </WalletScreen>
  );
}
