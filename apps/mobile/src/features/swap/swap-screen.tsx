import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { NavBar } from '@/components/ui/nav-bar';
import { OptionSheet } from '@/components/ui/option-sheet';
import { formatUnits, parseUnits } from '@/core/solana/amount';
import {
  type Quote,
  type SwapToken,
  SLIPPAGE_BPS,
  SOL_MINT,
  SWAP_TOKENS,
  buildSwapTransaction,
  getQuote,
} from '@/core/solana/jupiter';
import { useNetwork } from '@/core/solana/network';
import { getBalance, getTokenBalances, sendTransaction, simulateUnsigned } from '@/core/solana/rpc';
import { describeSimulationError } from '@/core/solana/errors';
import { signSerializedTransaction } from '@/core/solana/transaction';
import { getWalletMeta } from '@/core/wallet/storage';
import { PinKeypad } from '@/features/pin/pin-keypad';
import { useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { NetworkSheet } from '@/features/profile/network-sheet';
import { requestVerifiedSecret } from '@/features/send/authorize';
import { useSettings } from '@/lib/settings';

/** SOL kept back when swapping SOL: network fees plus the small deposit for a new token account. */
const SOL_RESERVE = 10_000_000n;

function TokenChip({ token, onPress }: { token: SwapToken; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose token, now ${token.symbol}`}
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full bg-raised py-1.5 pl-1.5 pr-3 active:opacity-85">
      <View className="size-6 items-center justify-center rounded-full" style={{ backgroundColor: token.color }}>
        <Text className="font-inter-bold text-[11px] text-canvas">{token.symbol.slice(0, 1)}</Text>
      </View>
      <Text className="font-inter-semibold text-[13px] leading-5 text-ink">{token.symbol}</Text>
    </Pressable>
  );
}

export function SwapScreen() {
  const insets = useSafeAreaInsets();
  const meta = useWalletMeta();
  const { cluster, label } = useNetwork();
  const { faceIdToSend } = useSettings();
  const mainnet = cluster === 'mainnet-beta';

  const [from, setFrom] = useState(SWAP_TOKENS[0]);
  const [to, setTo] = useState(SWAP_TOKENS[1]);
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [quote, setQuote] = useState<{ key: string; value: Quote } | { key: string; error: string } | null>(null);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const address = meta?.address;
  const units = parseUnits(amount, from.decimals) ?? 0n;
  const balance = balances[from.mint] ?? null;
  const spendable = balance === null ? null : from.mint === SOL_MINT ? (balance > SOL_RESERVE ? balance - SOL_RESERVE : 0n) : balance;
  const overBalance = spendable !== null && units > spendable;
  const quoteKey = `${from.mint}>${to.mint}:${units}`;

  // Balances for the three swappable tokens.
  useEffect(() => {
    if (!address || !mainnet) return;
    let cancelled = false;
    Promise.all([getBalance(address), getTokenBalances(address)])
      .then(([sol, tokens]) => {
        if (cancelled) return;
        const next: Record<string, bigint> = { [SOL_MINT]: sol };
        for (const token of tokens) next[token.mint] = (next[token.mint] ?? 0n) + token.amount;
        setBalances(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, mainnet]);

  // A fresh quote shortly after the amount or pair changes, and every 15 seconds while it is shown.
  useEffect(() => {
    if (!mainnet || units === 0n || overBalance) return;
    let cancelled = false;
    const load = () =>
      getQuote(from, to, units)
        .then((value) => !cancelled && setQuote({ key: quoteKey, value }))
        .catch((e: Error) => !cancelled && setQuote({ key: quoteKey, error: e.message }));
    const first = setTimeout(load, 400);
    const every = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(every);
    };
  }, [mainnet, from, to, units, overBalance, quoteKey]);

  const current = quote?.key === quoteKey ? quote : null;
  const good = current && 'value' in current ? current.value : null;
  const failure = current && 'error' in current ? current.error : null;
  const loadingQuote = mainnet && units > 0n && !overBalance && !current;

  const keys = useMemo(
    () => ({
      press: (key: string) =>
        setAmount((value) => {
          if (key === '.') return value.includes('.') ? value : `${value || '0'}.`;
          if (value === '0') return key;
          const next = value + key;
          return (next.split('.')[1]?.length ?? 0) > from.decimals ? value : next;
        }),
      backspace: () => setAmount((value) => value.slice(0, -1)),
    }),
    [from.decimals],
  );

  const flip = useCallback(() => {
    setFrom(to);
    setTo(from);
    setAmount('');
  }, [from, to]);

  function choose(side: 'from' | 'to', mint: string) {
    const token = SWAP_TOKENS.find((t) => t.mint === mint)!;
    if (side === 'from') {
      if (token.mint === to.mint) setTo(from);
      setFrom(token);
    } else {
      if (token.mint === from.mint) setFrom(to);
      setTo(token);
    }
    setAmount('');
  }

  async function swap() {
    if (!good || !address || busy) return;
    setBusy(true);
    try {
      const walletMeta = await getWalletMeta();
      if (!walletMeta) throw new Error('No wallet on this device.');
      const unsigned = await buildSwapTransaction(good, walletMeta.address);

      // Dry-run first: the network tells us if this would fail, before anything is signed.
      const simulation = await simulateUnsigned(unsigned);
      if (simulation.err !== null) throw new Error(describeSimulationError(simulation.err, simulation.logs));

      const secret = await requestVerifiedSecret(walletMeta, walletMeta.biometric && faceIdToSend);
      if (!secret) return;
      const { account } = secret;
      let signature: string;
      try {
        const signed = signSerializedTransaction(unsigned, account.privateKey, account.publicKey);
        signature = await sendTransaction(signed.wireBase64);
      } finally {
        account.privateKey.fill(0);
      }
      router.replace({
        pathname: '/swap-sent',
        params: {
          signature,
          summary: `${formatUnits(good.inAmount, from.decimals, 6)} ${from.symbol} → ${formatUnits(good.outAmount, to.decimals, 6)} ${to.symbol}`,
        },
      });
    } catch (error) {
      Alert.alert("Couldn't swap", error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const rate = good && good.inAmount > 0n
    ? (Number(good.outAmount) / 10 ** to.decimals) / (Number(good.inAmount) / 10 ** from.decimals)
    : null;

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <NavBar title="Swap" onBack={() => router.back()} />

      {!mainnet ? (
        <View className="flex-1 gap-4 px-6 pt-4">
          <Callout tone="info">
            {`Swaps use real exchanges, and those only exist on Solana mainnet. You are on ${label.toLowerCase()}, which has test money and no markets.`}
          </Callout>
          <Button label="Switch network" onPress={() => setNetworkOpen(true)} />
        </View>
      ) : (
        <>
          <View className="gap-2 px-6 pt-2">
            <View className="gap-2 rounded-2xl bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">YOU PAY</Text>
                <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
                  Available {balance === null ? '—' : formatUnits(balance, from.decimals, 4)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className={`flex-1 font-jetbrains-bold text-[32px] leading-10 ${overBalance ? 'text-sell' : 'text-ink'}`}>
                  {amount || '0'}
                </Text>
                <TokenChip token={from} onPress={() => setPicking('from')} />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={spendable === null}
                onPress={() => spendable !== null && setAmount(formatUnits(spendable, from.decimals))}
                className="self-start rounded-xl bg-raised px-2.5 py-0.5">
                <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-accent">MAX</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Swap direction"
              onPress={flip}
              className="-my-4 z-10 size-9 items-center justify-center self-center rounded-full border-4 border-canvas bg-raised">
              <Text className="font-inter-bold text-[14px] text-accent">⇅</Text>
            </Pressable>

            <View className="gap-2 rounded-2xl bg-surface p-4">
              <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">YOU RECEIVE</Text>
              <View className="flex-row items-center justify-between gap-3">
                <Text numberOfLines={1} adjustsFontSizeToFit className="flex-1 font-jetbrains-bold text-[32px] leading-10 text-ink">
                  {good ? formatUnits(good.outAmount, to.decimals, 6) : '0'}
                </Text>
                <TokenChip token={to} onPress={() => setPicking('to')} />
              </View>
            </View>
          </View>

          <View className="flex-1 gap-1 px-6 pt-3">
            {loadingQuote ? (
              <ActivityIndicator color="#7d8590" />
            ) : overBalance ? (
              <Text className="font-inter text-[13px] leading-5 text-sell">
                {from.mint === SOL_MINT ? 'That is more than you can swap after keeping some SOL for fees.' : `You don't have that much ${from.symbol}.`}
              </Text>
            ) : failure ? (
              <Text className="font-inter text-[13px] leading-5 text-sell">{failure}</Text>
            ) : good ? (
              <>
                <Detail label="Rate" value={rate === null ? '—' : `1 ${from.symbol} ≈ ${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${to.symbol}`} />
                <Detail label={`Minimum received (${SLIPPAGE_BPS / 100}% slippage)`} value={`${formatUnits(good.minOut, to.decimals, 6)} ${to.symbol}`} />
                <Detail label="Price impact" value={`${good.priceImpactPct.toFixed(2)}%`} warn={good.priceImpactPct > 1} />
                <Detail label="Route" value={good.route.join(' + ')} />
              </>
            ) : null}
            {good && good.priceImpactPct > 1 ? (
              <Callout tone="warning">This swap moves the price a lot. You may get a much worse deal than the market price.</Callout>
            ) : null}
            <Callout tone="danger">Mainnet: real money. A swap can&apos;t be undone.</Callout>
          </View>

          <PinKeypad extraKey="." onDigit={keys.press} onBackspace={keys.backspace} />
          <View className="px-6" style={{ paddingBottom: insets.bottom + 8 }}>
            <Button
              label={busy ? 'Swapping…' : 'Swap'}
              disabled={!good || overBalance || busy}
              onPress={() => void swap()}
            />
          </View>
        </>
      )}

      <OptionSheet
        title={picking === 'to' ? 'Receive' : 'Pay with'}
        visible={picking !== null}
        options={SWAP_TOKENS.map((t) => ({ value: t.mint, label: `${t.symbol} · ${t.name}` }))}
        selected={picking === 'to' ? to.mint : from.mint}
        onSelect={(mint) => picking && choose(picking, mint)}
        onClose={() => setPicking(null)}
      />
      <NetworkSheet visible={networkOpen} onClose={() => setNetworkOpen(false)} />
    </View>
  );
}

function Detail({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-1">
      <Text className="flex-1 font-inter text-[13px] leading-5 text-ink-muted">{label}</Text>
      <Text className={`font-jetbrains text-[12px] leading-5 ${warn ? 'text-sell' : 'text-ink'}`}>{value}</Text>
    </View>
  );
}
