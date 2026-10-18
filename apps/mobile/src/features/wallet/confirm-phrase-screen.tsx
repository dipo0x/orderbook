import { usePreventScreenCapture } from 'expo-screen-capture';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { WORDLIST } from '@/core/wallet/mnemonic';

import { SeedGrid } from './seed-grid';
import { SeedWordChip } from './seed-word-chip';
import { useWalletSetup } from './setup-context';
import { useSaveWallet } from './use-save-wallet';
import { WalletScreen } from './wallet-screen';

const BLANK_COUNT = 2;
const DECOY_COUNT = 4;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Picks which words to hide, and a shuffled bank of the right words plus decoys. */
function buildQuiz(words: string[]) {
  const blanks = shuffle(words.map((_, i) => i))
    .slice(0, BLANK_COUNT)
    .sort((a, b) => a - b);
  const taken = new Set(words);
  const decoys = shuffle(WORDLIST.filter((word) => !taken.has(word))).slice(0, DECOY_COUNT);
  const bank = shuffle([...blanks.map((i) => words[i]), ...decoys]);
  return { blanks, bank };
}

export function ConfirmPhraseScreen() {
  usePreventScreenCapture();
  const { mnemonic } = useWalletSetup();
  const { save, saving } = useSaveWallet();
  const words = useMemo(() => mnemonic?.split(' ') ?? [], [mnemonic]);
  const quiz = useMemo(() => buildQuiz(words), [words]);
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!mnemonic) return <Redirect href="/wallet" />;

  const { blanks, bank } = quiz;
  const nextBlank = blanks.find((i) => filled[i] === undefined);
  const done = nextBlank === undefined;

  function pick(word: string) {
    if (nextBlank === undefined) return;
    if (words[nextBlank] !== word) {
      setError(`That's not word ${nextBlank + 1}. Try again.`);
      return;
    }
    setError(null);
    setFilled((prev) => ({ ...prev, [nextBlank]: word }));
  }

  function clear(index: number) {
    setError(null);
    setFilled((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  return (
    <WalletScreen
      onBack={() => router.back()}
      footer={<Button label="Confirm" onPress={() => void save()} disabled={!done || saving} />}>
      <ScreenHeading
        title="Confirm your phrase"
        body="Tap the missing words in order so we know the backup is right."
      />
      <SeedGrid
        count={words.length}
        renderChip={(i) => {
          if (!blanks.includes(i)) return <SeedWordChip index={i + 1} word={words[i]} />;
          if (filled[i] !== undefined) {
            return <SeedWordChip index={i + 1} word={filled[i]} onPress={() => clear(i)} />;
          }
          return <SeedWordChip index={i + 1} state={i === nextBlank ? 'active' : 'blank'} />;
        }}
      />
      <Text
        className={`font-inter-medium text-[11px] leading-4 tracking-[0.4px] ${error ? 'text-sell' : 'text-accent'}`}>
        {error ?? (done ? 'ALL SET' : `TAP WORD ${nextBlank + 1}`)}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {bank.map((word) => {
          const placed = Object.values(filled).includes(word);
          return (
            <Pressable
              key={word}
              accessibilityRole="button"
              disabled={placed || done}
              onPress={() => pick(word)}
              className={`items-center justify-center rounded-lg border border-line-strong bg-raised px-4 py-[9px] active:opacity-85 ${placed ? 'opacity-30' : ''}`}>
              <Text className="font-jetbrains-medium text-[12px] leading-5 text-ink">{word}</Text>
            </Pressable>
          );
        })}
      </View>
    </WalletScreen>
  );
}
