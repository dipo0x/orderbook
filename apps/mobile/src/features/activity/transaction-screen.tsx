import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { formatLamports, formatLamportsExact } from '@/core/solana/amount';
import { shortAddress } from '@/core/solana/address';
import { explorerTxUrl } from '@/core/solana/config';
import { useNetwork } from '@/core/solana/network';
import { type ParsedActivity, getTransactionDetail } from '@/core/solana/rpc';
import { useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { WalletScreen } from '@/features/wallet/wallet-screen';

import { fullDate, kindOf } from './format';

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`h-11 flex-row items-center gap-3 ${last ? '' : 'border-b border-line'}`}>
      <Text className="flex-1 font-inter text-[13px] leading-5 text-ink-muted">{label}</Text>
      <Text className="font-jetbrains-medium text-[12px] leading-5 text-ink">{value}</Text>
    </View>
  );
}

export function TransactionScreen() {
  const { signature } = useLocalSearchParams<{ signature: string }>();
  const meta = useWalletMeta();
  const address = meta?.address;
  const { cluster, ready, label } = useNetwork();
  const [item, setItem] = useState<ParsedActivity | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address || !ready || !signature) return;
    let cancelled = false;
    getTransactionDetail(address, signature)
      .then((result) => {
        if (cancelled) return;
        if (result) setItem(result);
        else setMissing(true);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [address, ready, signature]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const openExplorer = () => void Linking.openURL(explorerTxUrl(signature, cluster));
  const received = item ? kindOf(item) === 'received' : false;
  const you = address ? `${shortAddress(address)} (you)` : 'You';
  const other = item?.counterparty ? shortAddress(item.counterparty) : 'Unknown';
  const amount = item
    ? `${received ? '+' : '−'}${formatLamports(received ? item.lamportDelta : -item.lamportDelta, 4)} SOL`
    : '';

  return (
    <WalletScreen
      title="Transaction"
      onBack={() => router.back()}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="View on Solscan" hitSlop={10} onPress={openExplorer}>
          <Image source={require('@/assets/images/portfolio/icon-external.svg')} className="size-5" />
        </Pressable>
      }
      footer={<Button label="View on Solscan" variant="secondary" onPress={openExplorer} />}>
      {item ? (
        <>
          <View className="items-center gap-2 rounded-2xl bg-surface py-5">
            <View className={`size-14 items-center justify-center rounded-full ${item.failed ? 'bg-sell-bg' : 'bg-live-bg'}`}>
              <Image
                source={
                  item.failed
                    ? require('@/assets/images/portfolio/icon-x-red.svg')
                    : require('@/assets/images/portfolio/icon-check-green.svg')
                }
                className="size-[26px]"
              />
            </View>
            <Text className="font-jetbrains-bold text-[26px] leading-[34px] text-ink">{amount}</Text>
            <Text className="font-inter text-[13px] leading-5 text-ink-muted">
              {item.failed ? 'Only the network fee was charged' : received ? 'Received' : 'Sent'}
            </Text>
            <View className={`flex-row items-center gap-1.5 rounded-xl py-1 pl-2.5 pr-3 ${item.failed ? 'bg-sell-bg' : 'bg-live-bg'}`}>
              <View className={`size-1.5 rounded-full ${item.failed ? 'bg-sell' : 'bg-buy'}`} />
              <Text className={`font-inter-medium text-[11px] leading-4 tracking-[0.4px] ${item.failed ? 'text-sell' : 'text-buy'}`}>
                {item.failed ? 'FAILED' : 'CONFIRMED'}
              </Text>
            </View>
          </View>

          <View className="rounded-[14px] bg-surface px-4 py-1">
            {item.blockTime ? <Row label="Date" value={fullDate(item.blockTime)} /> : null}
            <Row label="From" value={received ? other : you} />
            <Row label="To" value={received ? you : other} />
            <Row label="Network" value={`Solana ${label.toLowerCase()}`} />
            <Row label="Network fee" value={`${formatLamportsExact(item.fee)} SOL`} />
            {item.slot !== null ? <Row label="Slot" value={item.slot.toLocaleString('en-US')} /> : null}
            <Row label="Signature" value={shortAddress(item.signature)} last />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await Clipboard.setStringAsync(item.signature);
              setCopied(true);
            }}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-raised py-3 active:opacity-85">
            <Image source={require('@/assets/images/wallet/icon-copy-accent.svg')} className="size-4" />
            <Text className="font-inter-medium text-[13px] leading-5 text-accent">
              {copied ? 'Copied' : 'Copy signature'}
            </Text>
          </Pressable>
        </>
      ) : missing ? (
        <Text className="py-10 text-center font-inter text-[13px] leading-5 text-ink-muted">
          Couldn&apos;t load this transaction. It may still be settling, or the network is busy.
        </Text>
      ) : (
        <View className="items-center py-10">
          <ActivityIndicator color="#7d8590" />
        </View>
      )}
    </WalletScreen>
  );
}
