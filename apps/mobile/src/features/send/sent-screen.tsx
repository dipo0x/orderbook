import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { shortAddress } from '@/core/solana/address';
import { explorerTxUrl } from '@/core/solana/config';
import { useNetwork } from '@/core/solana/network';
import { formatLamportsExact } from '@/core/solana/amount';
import { getSignatureStatus } from '@/core/solana/rpc';
import { WalletScreen } from '@/features/wallet/wallet-screen';

import { useSend } from './send-context';

const POLL_MS = 1_000;
const GIVE_UP_MS = 60_000;

type Outcome = { state: 'confirming' } | { state: 'confirmed'; seconds: number } | { state: 'failed' } | { state: 'timeout' };

/** Shows the result: waits for the network to confirm the transaction before claiming success. */
export function SentScreen() {
  const send = useSend();
  const { cluster } = useNetwork();
  const [outcome, setOutcome] = useState<Outcome>({ state: 'confirming' });
  const signature = send.signature;

  useEffect(() => {
    if (!signature || !send.sentAt) return;
    const startedAt = send.sentAt;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const status = await getSignatureStatus(signature);
        if (cancelled) return;
        if (status?.err) {
          setOutcome({ state: 'failed' });
          clearInterval(timer);
        } else if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          setOutcome({ state: 'confirmed', seconds: (Date.now() - startedAt) / 1000 });
          clearInterval(timer);
        } else if (Date.now() - startedAt > GIVE_UP_MS) {
          setOutcome({ state: 'timeout' });
          clearInterval(timer);
        }
      } catch {
        // A failed poll isn't a failed transaction: keep trying until the deadline.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [signature, send.sentAt]);

  if (!signature) return <WalletScreen>{null}</WalletScreen>;

  const confirmed = outcome.state === 'confirmed';
  const failed = outcome.state === 'failed';
  const title = confirmed ? 'Sent' : failed ? "Didn't go through" : outcome.state === 'timeout' ? 'Still processing' : 'Sending…';
  const subtitle = confirmed
    ? `Confirmed on Solana in ${outcome.seconds.toFixed(1)}s`
    : failed
      ? 'The network rejected this transaction. No funds were moved.'
      : outcome.state === 'timeout'
        ? 'It may still confirm. Check the signature on Solscan.'
        : 'Waiting for the network to confirm…';

  return (
    <WalletScreen
      showNavBar={false}
      footer={
        <>
          <Button variant="secondary" label="View on Solscan" onPress={() => void Linking.openURL(explorerTxUrl(signature, cluster))} />
          <Button
            label="Done"
            onPress={() => {
              send.reset();
              router.navigate('/(tabs)/wallet');
            }}
          />
        </>
      }>
      <View className="items-center gap-3 pt-24">
        <View
          className={`size-24 items-center justify-center rounded-full ${failed ? 'bg-sell-bg' : 'bg-live-bg'}`}>
          {confirmed ? (
            <Image source={require('@/assets/images/onboarding/icon-check.svg')} className="size-10" />
          ) : (
            <Text className="font-jetbrains-bold text-[32px] text-ink-muted">{failed ? '!' : '…'}</Text>
          )}
        </View>
        <Text className="font-inter-bold text-[26px] leading-8 text-ink">{title}</Text>
        {!failed ? (
          <Text className="font-jetbrains-bold text-[20px] leading-7 text-buy">
            {formatLamportsExact(send.lamports)} SOL
          </Text>
        ) : null}
        <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">{subtitle}</Text>
      </View>
      <View className="mt-6 rounded-2xl bg-surface px-4">
        {[
          ['To', shortAddress(send.to)],
          ['Network fee', `${formatLamportsExact(send.fee || 5000n)} SOL`],
          ['Signature', shortAddress(signature)],
        ].map(([label, value], i) => (
          <View key={label} className={`flex-row items-center justify-between py-3 ${i < 2 ? 'border-b border-line' : ''}`}>
            <Text className="font-inter text-[13px] leading-5 text-ink-muted">{label}</Text>
            <Text className="font-jetbrains text-[12px] leading-5 text-ink">{value}</Text>
          </View>
        ))}
      </View>
    </WalletScreen>
  );
}
