import { base58 } from '@scure/base';
import { router } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { getWalletMeta } from '@/core/wallet/storage';
import { requestVerifiedSecret } from '@/features/send/authorize';
import { WalletScreen } from '@/features/wallet/wallet-screen';
import { copySensitive } from '@/lib/sensitive-clipboard';

/** Shows the wallet's private key (the format Phantom and Solflare import), after Face ID or the PIN. */
export function ExportKeyScreen() {
  usePreventScreenCapture();
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // The key never stays in memory once the screen is left.
  useEffect(() => () => setKey(null), []);

  async function reveal() {
    if (busy) return;
    setBusy(true);
    try {
      const meta = await getWalletMeta();
      if (!meta) return;
      const secret = await requestVerifiedSecret(meta, meta.biometric);
      if (!secret) return;
      const { account } = secret;
      try {
        // A Solana "secret key" is the 32-byte seed followed by the 32-byte public key.
        const bytes = new Uint8Array(64);
        bytes.set(account.privateKey, 0);
        bytes.set(account.publicKey, 32);
        setKey(base58.encode(bytes));
        bytes.fill(0);
      } finally {
        account.privateKey.fill(0);
      }
    } catch (error) {
      Alert.alert("Couldn't export the key", error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!key) {
    return (
      <WalletScreen
        onBack={() => router.back()}
        footer={
          <>
            <Button label="Use Face ID" onPress={() => void reveal()} disabled={busy} />
            <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
          </>
        }>
        <ScreenHeading title="Confirm it's you" body="Use Face ID or your PIN to export your private key." />
        <View className="items-center pt-16">
          <View className="size-[132px] items-center justify-center rounded-full border-2 border-accent bg-raised">
            <Image source={require('@/assets/images/wallet/icon-face-id.svg')} className="size-14" />
          </View>
        </View>
      </WalletScreen>
    );
  }

  return (
    <WalletScreen
      onBack={() => router.back()}
      footer={
        <>
          <Button
            variant="secondary"
            label={copied ? 'Copied (clears in 2 min)' : 'Copy private key'}
            onPress={async () => {
              await copySensitive(key);
              setCopied(true);
            }}
          />
          <Button label="Done" onPress={() => router.back()} />
        </>
      }>
      <ScreenHeading
        title="Your private key"
        body="Make sure nobody is watching. Screenshots and screen recording are blocked on this screen."
      />
      <Callout tone="danger">
        Anyone with this key can take all your funds, with no phrase needed. Never share it, and never
        paste it into a website.
      </Callout>
      <View className="rounded-xl border border-line bg-surface p-4">
        <Text selectable className="font-jetbrains text-[13px] leading-5 text-ink">
          {key}
        </Text>
      </View>
    </WalletScreen>
  );
}
