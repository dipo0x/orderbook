import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { SettingsRow } from '@/components/ui/settings-row';
import { LAMPORTS_PER_SOL } from '@/core/solana/amount';
import { shortAddress } from '@/core/solana/address';
import { useNetwork } from '@/core/solana/network';
import { countSignatures } from '@/core/solana/rpc';
import { useTickers } from '@/features/markets/use-tickers';
import { useWalletData, useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { useFiat } from '@/lib/currency';
import { useWatchlist } from '@/lib/watchlist';

import { NetworkSheet } from './network-sheet';

const SOL_MARKET = ['SOL-USDT'] as const;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-xl bg-surface py-3.5">
      <Text className="font-jetbrains-medium text-[16px] leading-[22px] text-ink">{value}</Text>
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

function Group({ label }: { label: string }) {
  return (
    <View className="px-4 pb-2 pt-5">
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const meta = useWalletMeta();
  const address = meta?.address;
  const { cluster, ready, label } = useNetwork();
  const { lamports } = useWalletData(address);
  const sol = useTickers(SOL_MARKET)['SOL-USDT'];
  const watchlist = useWatchlist();
  const [copied, setCopied] = useState(false);
  const [txCount, setTxCount] = useState<number | null>(null);
  const [networkOpen, setNetworkOpen] = useState(false);
  const fx = useFiat();

  useEffect(() => {
    if (!address || !ready) return;
    let cancelled = false;
    countSignatures(address)
      .then((count) => {
        if (!cancelled) setTxCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, ready, cluster]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const fiat =
    lamports !== null && sol ? (Number(lamports) / Number(LAMPORTS_PER_SOL)) * Number(sol.last) : null;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}>
      <View className="px-4 pb-1 pt-2">
        <Text className="font-inter-bold text-[30px] leading-9 text-ink">Profile</Text>
      </View>

      {address ? (
        <>
          <View className="px-4 pt-2">
            <View className="flex-row items-center gap-3.5 rounded-2xl bg-surface p-4">
              <View className="size-[52px] items-center justify-center rounded-[20px] border-[1.5px] border-accent bg-line-strong">
                <Text className="font-inter-bold text-[14px] leading-5 text-accent">0x</Text>
              </View>
              <View className="flex-1 gap-[3px]">
                <Text className="font-inter-semibold text-[16px] leading-6 text-ink">Main wallet</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy address"
                  onPress={async () => {
                    await Clipboard.setStringAsync(address);
                    setCopied(true);
                  }}
                  className="flex-row items-center gap-1.5">
                  <Text className="font-jetbrains text-[13px] leading-5 text-ink-muted">
                    {copied ? 'Copied' : shortAddress(address)}
                  </Text>
                  <Image source={require('@/assets/images/profile/icon-copy.svg')} className="size-[13px]" />
                </Pressable>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2 px-4 pt-3">
            <Stat value={fiat === null ? '—' : fx.format(fiat, 0)} label="Balance" />
            <Stat value={String(watchlist.ids.length)} label="Watchlist" />
            <Stat value={txCount === null ? '—' : txCount >= 100 ? '100+' : String(txCount)} label="Transactions" />
          </View>
        </>
      ) : meta === null ? (
        <View className="items-center gap-3 px-10 py-8">
          <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
            No wallet on this phone yet.
          </Text>
          <View className="w-[200px]">
            <Button label="Set up wallet" onPress={() => router.push('/setup')} />
          </View>
        </View>
      ) : null}

      <Group label="WALLET" />
      <SettingsRow
        label="Wallet & keys"
        icon={require('@/assets/images/profile/icon-wallet.svg')}
        onPress={meta ? () => router.push('/wallet-keys') : undefined}
      />
      <SettingsRow
        label="Security"
        icon={require('@/assets/images/profile/icon-shield.svg')}
        onPress={meta ? () => router.push('/security') : undefined}
      />
      <SettingsRow
        label="Network"
        icon={require('@/assets/images/profile/icon-globe.svg')}
        value={`Solana ${label.toLowerCase()}`}
        onPress={() => setNetworkOpen(true)}
      />

      <Group label="APP" />
      <SettingsRow
        label="Notifications"
        icon={require('@/assets/images/profile/icon-bell.svg')}
        onPress={() => router.push('/notifications')}
      />
      <SettingsRow
        label="Settings"
        icon={require('@/assets/images/profile/icon-eye.svg')}
        onPress={() => router.push('/settings')}
      />
      <SettingsRow
        label="About"
        icon={require('@/assets/images/profile/icon-info.svg')}
        onPress={() => router.push('/about')}
      />
      <NetworkSheet visible={networkOpen} onClose={() => setNetworkOpen(false)} />
    </ScrollView>
  );
}
