import { usePreventScreenCapture } from 'expo-screen-capture';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { copySensitive } from '@/lib/sensitive-clipboard';

import { SeedGrid } from './seed-grid';
import { SeedWordChip } from './seed-word-chip';
import { useWalletSetup } from './setup-context';
import { WalletScreen } from './wallet-screen';

function ToolButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2 active:opacity-85">
      <Image source={icon} className="size-3.5" />
      <Text className="font-inter-medium text-[13px] leading-5 text-ink-muted">{label}</Text>
    </Pressable>
  );
}

export function RecoveryPhraseScreen() {
  usePreventScreenCapture();
  const { mnemonic } = useWalletSetup();
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!mnemonic) return <Redirect href="/setup" />;
  const words = mnemonic.split(' ');

  async function copy() {
    await copySensitive(words.join(' '));
    setCopied(true);
  }

  return (
    <WalletScreen
      onBack={() => router.back()}
      footer={
        <Button label="I've written them down" onPress={() => router.push('/setup/confirm-phrase')} />
      }>
      <ScreenHeading
        title="Write these 12 words down"
        body="In order, on paper. This phrase is the only way back into your wallet if you lose this phone."
      />
      <Callout tone="danger">
        Anyone with these 12 words can take your funds. Never share them, and never type them into a
        website.
      </Callout>
      <SeedGrid
        count={words.length}
        renderChip={(i) => (
          <SeedWordChip index={i + 1} word={hidden ? '••••••' : words[i]} />
        )}
      />
      <View className="flex-row justify-center gap-2">
        <ToolButton
          label={copied ? 'Copied' : 'Copy'}
          icon={require('@/assets/images/wallet/icon-copy-muted.svg')}
          onPress={() => void copy()}
        />
        <ToolButton
          label={hidden ? 'Show' : 'Hide'}
          icon={require('@/assets/images/wallet/icon-eye-off.svg')}
          onPress={() => setHidden((value) => !value)}
        />
      </View>
    </WalletScreen>
  );
}
