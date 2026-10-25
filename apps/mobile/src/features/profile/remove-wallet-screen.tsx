import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { deleteWallet } from '@/core/wallet/storage';
import { unregisterPush } from '@/lib/push';
import { WalletScreen } from '@/features/wallet/wallet-screen';

const CONFIRM_WORD = 'REMOVE';

/** Deleting the wallet is only possible by typing a word, so it can't happen by an accidental tap. */
export function RemoveWalletScreen() {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

  async function remove() {
    if (!ready || busy) return;
    setBusy(true);
    // Stop alerts for this wallet before it is gone.
    await unregisterPush();
    await deleteWallet();
    // Back to the start: the splash route sends a phone with no wallet to onboarding.
    router.dismissAll();
    router.replace('/');
  }

  return (
    <WalletScreen
      onBack={() => router.back()}
      footer={
        <>
          <Button
            variant="danger"
            label={busy ? 'Removing…' : 'Remove wallet'}
            onPress={() => void remove()}
            disabled={!ready || busy}
          />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </>
      }>
      <ScreenHeading
        title="Remove wallet?"
        body="This deletes the encrypted key from this phone. Without your written recovery phrase, the funds are gone for good."
      />
      <Callout tone="danger">Check that your 12 words are written down and correct before you continue.</Callout>
      <View className="gap-2 pt-2">
        <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
          TYPE {CONFIRM_WORD} TO CONFIRM
        </Text>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRM_WORD}
          placeholderTextColor="#4b535d"
          accessibilityLabel="Type REMOVE to confirm"
          className="h-12 rounded-xl border border-line bg-surface px-4 font-jetbrains text-[13px] text-ink"
        />
      </View>
    </WalletScreen>
  );
}
