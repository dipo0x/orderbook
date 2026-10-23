import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { NavBar } from '@/components/ui/nav-bar';
import { LAMPORTS_PER_SOL, formatLamports, formatLamportsExact, parseSolToLamports } from '@/core/solana/amount';
import { isValidAddress } from '@/core/solana/address';
import { getBalance } from '@/core/solana/rpc';
import { PinKeypad } from '@/features/pin/pin-keypad';
import { useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { useTickers } from '@/features/markets/use-tickers';
import { useFiat } from '@/lib/currency';

import { useSend } from './send-context';

const SOL_MARKET = ['SOL-USDT'] as const;
/** A plain transfer costs 5,000 lamports. Review shows the exact figure from the network. */
const BASE_FEE = 5_000n;
const MAX_DECIMALS = 9;

export function SendScreen() {
  const insets = useSafeAreaInsets();
  const meta = useWalletMeta();
  const send = useSend();
  const sol = useTickers(SOL_MARKET)['SOL-USDT'];
  const fx = useFiat();

  const [to, setTo] = useState(send.to);
  const [amount, setAmount] = useState(send.lamports > 0n ? formatLamportsExact(send.lamports) : '');
  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!meta?.address) return;
    let cancelled = false;
    getBalance(meta.address)
      .then((value) => {
        if (!cancelled) setBalance(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [meta?.address]);

  const lamports = parseSolToLamports(amount) ?? 0n;
  const addressOk = isValidAddress(to);
  const addressError = to.trim() !== '' && !addressOk ? "That isn't a valid Solana address." : null;
  const maxSpendable = balance !== null && balance > BASE_FEE ? balance - BASE_FEE : 0n;
  const overBalance = balance !== null && lamports > maxSpendable;
  const canReview = addressOk && lamports > 0n && !overBalance;

  const price = sol ? Number(sol.last) : null;
  const fiat = price !== null ? (Number(lamports) / Number(LAMPORTS_PER_SOL)) * price : null;

  const keys = useMemo(
    () => ({
      press: (key: string) =>
        setAmount((current) => {
          if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;
          if (current === '0') return key;
          const next = current + key;
          const decimals = next.split('.')[1]?.length ?? 0;
          return decimals > MAX_DECIMALS ? current : next;
        }),
      backspace: () => setAmount((current) => current.slice(0, -1)),
    }),
    [],
  );

  async function paste() {
    const text = (await Clipboard.getStringAsync()).trim();
    if (text) setTo(text);
  }

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <NavBar
        title="Send"
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={() => {
              send.reset();
              router.navigate('/(tabs)/wallet');
            }}>
            <Image source={require('@/assets/images/search/icon-close.svg')} className="size-3.5" />
          </Pressable>
        }
      />

      <View className="gap-2 px-6 pt-2">
        <View
          className={`flex-row items-center gap-3 rounded-xl border bg-surface px-4 py-3 ${
            addressError ? 'border-sell' : 'border-line'
          }`}>
          <View className="flex-1 gap-1">
            <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">TO</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="Paste a Solana address"
              placeholderTextColor="#4b535d"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel="Recipient address"
              className="p-0 font-jetbrains text-[13px] leading-5 text-ink"
            />
          </View>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void paste()}>
            <Text className="font-inter-medium text-[13px] leading-5 text-accent">Paste</Text>
          </Pressable>
        </View>
        {addressError ? <Text className="font-inter text-[13px] leading-5 text-sell">{addressError}</Text> : null}
      </View>

      <View className="flex-1 items-center justify-center gap-2 px-6">
        <View className="flex-row items-baseline gap-2">
          <Text
            className={`font-jetbrains-bold text-[48px] leading-[56px] ${overBalance ? 'text-sell' : 'text-ink'}`}>
            {amount || '0'}
          </Text>
          <Text className="font-jetbrains-medium text-[20px] leading-7 text-ink-muted">SOL</Text>
        </View>
        <Text className="font-jetbrains text-[13px] leading-5 text-ink-muted">
          {fiat !== null ? `≈ ${fx.format(fiat, 2)}` : ' '}
        </Text>
        <View className="flex-row items-center gap-2 pt-1">
          <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
            Available {balance === null ? '—' : formatLamports(balance, 4)} SOL
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={balance === null}
            onPress={() => setAmount(formatLamportsExact(maxSpendable))}
            className="rounded-xl bg-raised px-2.5 py-0.5">
            <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-accent">MAX</Text>
          </Pressable>
        </View>
        {overBalance ? (
          <Text className="font-inter text-[13px] leading-5 text-sell">
            That&apos;s more than you can send after the network fee.
          </Text>
        ) : null}
      </View>

      <PinKeypad extraKey="." onDigit={keys.press} onBackspace={keys.backspace} />
      <View className="px-6" style={{ paddingBottom: insets.bottom + 8 }}>
        <Button
          label="Review"
          disabled={!canReview}
          onPress={() => {
            send.setDraft(to.trim(), lamports);
            router.push('/send/review');
          }}
        />
      </View>
    </View>
  );
}
