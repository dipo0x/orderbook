import { useFocusEffect, router } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { getWalletMeta } from '@/core/wallet/storage';
import { requestVerifiedSecret } from '@/features/send/authorize';
import { SeedGrid } from '@/features/wallet/seed-grid';
import { SeedWordChip } from '@/features/wallet/seed-word-chip';
import { WalletScreen } from '@/features/wallet/wallet-screen';

/** Shows the recovery phrase again, but only after Face ID or the PIN. */
export function ViewPhraseScreen() {
  usePreventScreenCapture();
  const [phrase, setPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The phrase never stays in memory once the screen is left.
  useFocusEffect(
    useCallback(
      () => () => {
        setPhrase(null);
      },
      [],
    ),
  );

  async function reveal() {
    if (busy) return;
    setBusy(true);
    try {
      const meta = await getWalletMeta();
      if (!meta) return;
      const secret = await requestVerifiedSecret(meta, meta.biometric);
      if (secret) {
        secret.account.privateKey.fill(0);
        setPhrase(secret.mnemonic);
      }
    } catch (error) {
      Alert.alert("Couldn't show the phrase", error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const words = phrase?.split(' ') ?? [];

  if (!phrase) {
    return (
      <WalletScreen
        onBack={() => router.back()}
        footer={
          <>
            <Button label="Use Face ID" onPress={() => void reveal()} disabled={busy} />
            <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
          </>
        }>
        <ScreenHeading title="Confirm it's you" body="Use Face ID or your PIN to view your recovery phrase." />
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
      footer={<Button label="Done" onPress={() => router.back()} />}>
      <ScreenHeading
        title="Your recovery phrase"
        body="Make sure nobody is watching. Screenshots and screen recording are blocked on this screen."
      />
      <Callout tone="danger">
        Anyone with these 12 words can take your funds. Never share them, and never type them into a
        website.
      </Callout>
      <SeedGrid count={words.length} renderChip={(i) => <SeedWordChip index={i + 1} word={words[i]} />} />
      <View className="items-center">
        <Pressable
          accessibilityRole="button"
          onPress={() => setPhrase(null)}
          className="h-10 flex-row items-center gap-2 rounded-full border border-line-strong bg-surface px-4 active:opacity-85">
          <Image source={require('@/assets/images/profile/icon-eye-off.svg')} className="size-4" />
          <Text className="font-inter-medium text-[13px] leading-5 text-ink-muted">Hide</Text>
        </Pressable>
      </View>
    </WalletScreen>
  );
}
