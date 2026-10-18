import * as Clipboard from 'expo-clipboard';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { SOLANA_DERIVATION_PATH } from '@/core/wallet/derive';
import { isValidMnemonic, normalizeMnemonic, wordCount } from '@/core/wallet/mnemonic';

import { useWalletSetup } from './setup-context';
import { WalletScreen } from './wallet-screen';

export function ImportScreen() {
  usePreventScreenCapture();
  const { start } = useWalletSetup();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = wordCount(text);
  const target = count > 12 ? 24 : 12;

  async function paste() {
    const clipboard = await Clipboard.getStringAsync();
    if (clipboard) {
      setText(clipboard);
      setError(null);
    }
  }

  function submit() {
    if (count !== 12 && count !== 24) {
      setError('Recovery phrases have 12 or 24 words.');
      return;
    }
    if (!isValidMnemonic(text)) {
      setError("That phrase isn't valid. Check each word for typos.");
      return;
    }
    start('import', normalizeMnemonic(text));
    setText('');
    router.push('/wallet/biometrics');
  }

  return (
    <WalletScreen
      onBack={() => router.back()}
      footer={<Button label="Import wallet" onPress={submit} />}>
      <ScreenHeading
        title="Import a wallet"
        body="Enter the 12 or 24 words of your recovery phrase, separated by spaces."
      />
      <View
        className={`gap-2 rounded-[14px] border bg-surface p-3.5 ${
          error ? 'border-sell' : focused ? 'border-accent' : 'border-line'
        }`}>
        <TextInput
          multiline
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          importantForAutofill="no"
          textContentType="none"
          placeholder="Enter your recovery phrase"
          placeholderTextColor="#4b535d"
          value={text}
          onChangeText={(value) => {
            setText(value);
            setError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-h-[72px] p-0 font-jetbrains text-[14px] leading-6 text-ink"
          textAlignVertical="top"
        />
        <View className="flex-row items-center">
          <Text className="flex-1 font-jetbrains text-[11px] leading-4 text-ink-muted">
            {count} of {target} words
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void paste()}
            className="flex-row items-center gap-1.5 rounded-2xl bg-raised px-3 py-1.5 active:opacity-85">
            <Image source={require('@/assets/images/wallet/icon-copy-accent.svg')} className="size-[13px]" />
            <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-accent">
              Paste
            </Text>
          </Pressable>
        </View>
      </View>
      {error ? <Text className="font-inter text-[13px] leading-5 text-sell">{error}</Text> : null}
      <Callout tone="danger">
        Only type a phrase you created yourself. A phrase someone sent you is a scam — it lets them
        drain anything you add to it.
      </Callout>
      <View className="flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3.5">
        <View className="flex-1 gap-0.5">
          <Text className="font-inter text-[13px] leading-5 text-ink">Derivation path</Text>
          <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">
            {SOLANA_DERIVATION_PATH}
          </Text>
        </View>
        <Image source={require('@/assets/images/wallet/icon-chevron-right.svg')} className="size-4" />
      </View>
    </WalletScreen>
  );
}
