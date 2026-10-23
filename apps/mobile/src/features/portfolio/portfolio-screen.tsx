import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { changePercent, formatChange } from '@/core/market/format';
import { useNetwork } from '@/core/solana/network';
import { LAMPORTS_PER_SOL, formatLamports } from '@/core/solana/amount';
import { requestAirdrop } from '@/core/solana/rpc';
import { shortAddress } from '@/core/solana/address';
import { useTickers } from '@/features/markets/use-tickers';

import { Sparkline } from '@/components/ui/sparkline';
import { useSolHistory } from './use-sol-history';

import { useWalletData, useWalletMeta } from './use-wallet-data';
import { ActivityRow } from '@/features/activity/activity-row';
import { useFiat } from '@/lib/currency';
import { useSettings } from '@/lib/settings';

const SOL_MARKET = ['SOL-USDT'] as const;
const HIDDEN = '••••';

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: number;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 items-center gap-2 ${disabled ? 'opacity-40' : ''}`}>
      <View className="size-12 items-center justify-center rounded-3xl bg-raised">
        <Image source={icon} className="size-5" />
      </View>
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
        {label}
      </Text>
    </Pressable>
  );
}

function AssetRow({
  letter,
  color,
  symbol,
  name,
  amount,
  fiat,
  change,
  onPress,
}: {
  letter: string;
  color: string;
  symbol: string;
  name: string;
  amount: string;
  fiat?: string;
  change?: number | null;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      className="h-16 flex-row items-center gap-3 border-b border-line px-4 active:bg-surface">
      <View className="size-8 items-center justify-center rounded-2xl" style={{ backgroundColor: color }}>
        <Text className="font-inter-bold text-[13px] text-canvas">{letter}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-inter-medium text-[13px] leading-5 text-ink">{symbol}</Text>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">{name}</Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="font-jetbrains-medium text-[12px] leading-5 text-ink">{amount}</Text>
        {fiat ? (
          <View className="flex-row gap-1.5">
            <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">{fiat}</Text>
            {change != null ? (
              <Text
                className={`font-jetbrains text-[11px] leading-4 ${change < 0 ? 'text-sell' : 'text-buy'}`}>
                {formatChange(change)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const meta = useWalletMeta();
  const { isTestnet, label: networkLabel } = useNetwork();
  const fx = useFiat();
  const history = useSolHistory();
  const address = meta?.address;
  const { lamports, tokens, activity, error, refreshing, refresh } = useWalletData(address);
  const sol = useTickers(SOL_MARKET)['SOL-USDT'];
  // Coming back from Send (or any other screen) refreshes the balance straight away.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const { hideBalances } = useSettings();
  // Starts as the saved setting; the eye icon toggles it for this visit only.
  const [override, setOverride] = useState<boolean | null>(null);
  const hidden = override ?? hideBalances;
  const [busy, setBusy] = useState(false);

  const price = sol ? Number(sol.last) : null;
  const solChange = sol ? changePercent(sol) : null;
  const balanceSol = lamports === null ? null : Number(lamports) / Number(LAMPORTS_PER_SOL);
  const fiat = balanceSol !== null && price !== null ? balanceSol * price : null;
  const fiatToday = balanceSol !== null && sol ? balanceSol * (price! - Number(sol.open24h)) : null;
  const mask = (text: string) => (hidden ? HIDDEN : text);

  async function getTestSol() {
    if (!address || busy) return;
    setBusy(true);
    try {
      await requestAirdrop(address, LAMPORTS_PER_SOL);
      Alert.alert('Test SOL requested', 'It should arrive in a few seconds.');
      setTimeout(refresh, 5000);
    } catch {
      Alert.alert(
        'The faucet is busy',
        'The public devnet faucet is rate limited. You can get test SOL from the web faucet instead: your address will be copied, so just paste it there.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open faucet',
            onPress: async () => {
              await Clipboard.setStringAsync(address);
              void Linking.openURL('https://faucet.solana.com');
            },
          },
        ],
      );
    } finally {
      setBusy(false);
    }
  }

  if (meta === null) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas px-10">
        <Text className="font-inter-semibold text-[16px] leading-6 text-ink">No wallet yet</Text>
        <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
          Create a wallet, or import one you already use, to hold assets.
        </Text>
        <View className="w-[200px]">
          <Button label="Set up wallet" onPress={() => router.push('/setup')} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7d8590" />}>
      <View className="flex-row items-center px-4 pb-1 pt-2">
        <Text className="flex-1 font-inter-bold text-[30px] leading-9 text-ink">Wallet</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show balances' : 'Hide balances'}
          hitSlop={10}
          onPress={() => setOverride(!hidden)}>
          <Image source={require('@/assets/images/portfolio/icon-eye.svg')} className="size-5" />
        </Pressable>
      </View>

      <View className="gap-1.5 px-4 pb-4 pt-3">
        <View className="flex-row items-center gap-2">
          <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
            TOTAL BALANCE
          </Text>
          {/* Read-only: it reminds you which network you're on. Change it in Profile → Network. */}
          <View className={`rounded-full px-2 py-0.5 ${isTestnet ? 'bg-accent-bg' : 'bg-sell-bg'}`}>
            <Text
              className={`font-inter-medium text-[10px] leading-4 tracking-[0.4px] ${isTestnet ? 'text-accent' : 'text-sell'}`}>
              {isTestnet ? `${networkLabel.toUpperCase()} · TEST FUNDS` : 'MAINNET · REAL MONEY'}
            </Text>
          </View>
        </View>
        <Text className="font-jetbrains-bold text-[38px] leading-[46px] text-ink">
          {fiat === null ? '—' : mask(fx.format(fiat, 2))}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className={`rounded px-2 py-0.5 ${solChange !== null && solChange < 0 ? 'bg-sell-bg' : 'bg-live-bg'}`}>
            <Text
              className={`font-jetbrains-medium text-[12px] leading-5 ${solChange !== null && solChange < 0 ? 'text-sell' : 'text-buy'}`}>
              {formatChange(solChange)}
            </Text>
          </View>
          <Text className="font-inter text-[13px] leading-5 text-ink-muted">
            {fiatToday === null
              ? ''
              : mask(`${fiatToday < 0 ? '−' : '+'}${fx.format(Math.abs(fiatToday), 2)} today`)}
          </Text>
        </View>
        {error ? (
          <Text className="font-inter text-[13px] leading-5 text-sell">
            Couldn&apos;t reach the network. Pull down to try again.
          </Text>
        ) : null}
      </View>

      <View className="px-4">
        <Sparkline values={history} color={solChange !== null && solChange < 0 ? '#f6465d' : '#2ebd85'} />
        <Text className="pt-1 font-jetbrains text-[11px] leading-4 text-ink-faint">SOL price · last 24h</Text>
      </View>

      <View className="flex-row px-4 pb-1 pt-5">
        <ActionButton
          label="Send"
          icon={require('@/assets/images/portfolio/action-send.svg')}
          onPress={() => router.push('/send')}
        />
        <ActionButton
          label="Receive"
          icon={require('@/assets/images/portfolio/action-receive.svg')}
          onPress={() => router.push('/receive')}
        />
        <ActionButton label="Swap" icon={require('@/assets/images/portfolio/action-swap.svg')} disabled />
        <ActionButton
          label={isTestnet ? 'Faucet' : 'Buy'}
          icon={require('@/assets/images/portfolio/action-plus.svg')}
          onPress={isTestnet ? () => void getTestSol() : undefined}
          disabled={!isTestnet || busy}
        />
      </View>

      <View className="px-4 pb-2 pt-5">
        <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
          ASSETS
        </Text>
      </View>
      <AssetRow
        letter="S"
        color="#14f195"
        symbol="SOL"
        name="Solana"
        amount={lamports === null ? '—' : mask(formatLamports(lamports, 4))}
        fiat={fiat === null ? undefined : mask(fx.format(fiat, 2))}
        change={solChange}
        onPress={() => router.push('/asset')}
      />
      {tokens.map((token) => (
        <AssetRow
          key={token.mint}
          letter={token.mint.slice(0, 1)}
          color="#2f3742"
          symbol={shortAddress(token.mint)}
          name="SPL token"
          amount={mask((Number(token.amount) / 10 ** token.decimals).toFixed(Math.min(token.decimals, 4)))}
        />
      ))}

      <View className="flex-row items-center px-4 pb-2 pt-5">
        <Text className="flex-1 font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">
          RECENT ACTIVITY
        </Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.navigate('/(tabs)/activity')}>
          <Text className="font-inter-medium text-[13px] leading-5 text-accent">See all</Text>
        </Pressable>
      </View>
      {activity.length === 0 ? (
        <View className="px-4 py-3">
          <Text className="font-inter text-[13px] leading-5 text-ink-muted">
            {isTestnet ? 'No transactions yet. Get some test SOL from the faucet to get started.' : 'No transactions yet.'}
          </Text>
        </View>
      ) : (
        activity.map((item) => <ActivityRow key={item.signature} item={item} mask={mask} />)
      )}
    </ScrollView>
  );
}
