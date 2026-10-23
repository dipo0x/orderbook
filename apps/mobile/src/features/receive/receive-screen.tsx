import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { useNetwork } from '@/core/solana/network';
import { useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { WalletScreen } from '@/features/wallet/wallet-screen';

import { QrCode } from './qr-code';

export function ReceiveScreen() {
  const meta = useWalletMeta();
  const { isTestnet } = useNetwork();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const address = meta?.address;
  if (!address) return <WalletScreen onBack={() => router.back()}>{null}</WalletScreen>;

  // Break the address into two lines of equal width, as in the design.
  const middle = Math.ceil(address.length / 2);

  return (
    <WalletScreen
      onBack={() => router.back()}
      title="Receive"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share address"
          hitSlop={10}
          onPress={() => void Share.share({ message: address })}>
          <Image source={require('@/assets/images/portfolio/icon-share.svg')} className="size-5" />
        </Pressable>
      }
      footer={
        <>
          <Button
            label={copied ? 'Copied' : 'Copy address'}
            onPress={async () => {
              await Clipboard.setStringAsync(address);
              setCopied(true);
            }}
          />
          <Button variant="secondary" label="Share" onPress={() => void Share.share({ message: address })} />
        </>
      }>
      <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-surface py-2.5 pl-3 pr-3.5">
        <View className="size-7 items-center justify-center rounded-full bg-[#14f195]">
          <Text className="font-inter-bold text-[13px] text-canvas">S</Text>
        </View>
        <View className="flex-1">
          <Text className="font-inter-medium text-[13px] leading-5 text-ink">Solana</Text>
          <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">
            {isTestnet ? 'Solana devnet (test network)' : 'Solana mainnet'}
          </Text>
        </View>
      </View>
      <View className="items-center py-2">
        <QrCode value={address} />
      </View>
      <View className="items-center gap-2 rounded-xl bg-surface px-4 py-3.5">
        <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
          YOUR SOLANA ADDRESS
        </Text>
        <Text selectable className="text-center font-jetbrains text-[13px] leading-5 text-ink">
          {address.slice(0, middle)}
          {'\n'}
          {address.slice(middle)}
        </Text>
      </View>
      <Callout tone="warning">
        {isTestnet
          ? 'This is a devnet address. Only send test SOL here, never real funds.'
          : 'Send only Solana (SPL) assets to this address. Anything on another network will be lost.'}
      </Callout>
    </WalletScreen>
  );
}
