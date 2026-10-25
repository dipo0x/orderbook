import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';
import { NavBar } from '@/components/ui/nav-bar';
import { Sparkline } from '@/components/ui/sparkline';
import { changePercent, formatChange, formatPrice } from '@/core/market/format';
import { LAMPORTS_PER_SOL, formatLamports } from '@/core/solana/amount';
import { ActivityRow } from '@/features/activity/activity-row';
import { useTickers } from '@/features/markets/use-tickers';
import { useFiat } from '@/lib/currency';
import { useSettings } from '@/lib/settings';
import { useWatchlist } from '@/lib/watchlist';

import { useSolHistory } from './use-sol-history';
import { useWalletData, useWalletMeta } from './use-wallet-data';

const SOL_MARKET = ['SOL-USDT'] as const;

function Action({ label, icon, onPress, disabled }: { label: string; icon: number; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 items-center gap-2 ${disabled ? 'opacity-40' : ''}`}>
      <View className="size-12 items-center justify-center rounded-3xl bg-raised">
        <Image source={icon} className="size-5" />
      </View>
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </Pressable>
  );
}

/** Detail for the SOL holding: balance, price, quick actions and its own activity. */
export function AssetScreen() {
  const insets = useSafeAreaInsets();
  const meta = useWalletMeta();
  const { lamports, activity } = useWalletData(meta?.address);
  const sol = useTickers(SOL_MARKET)['SOL-USDT'];
  const history = useSolHistory();
  const { hideBalances } = useSettings();
  const fx = useFiat();
  const watchlist = useWatchlist();
  const starred = watchlist.has('SOL-USDT');

  const price = sol ? Number(sol.last) : null;
  const change = sol ? changePercent(sol) : null;
  const balance = lamports === null ? null : Number(lamports) / Number(LAMPORTS_PER_SOL);
  const fiat = balance !== null && price !== null ? balance * price : null;
  const mask = (text: string) => (hideBalances ? '••••' : text);
  const down = change !== null && change < 0;

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <NavBar
        title="Solana"
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={starred ? 'Remove from watchlist' : 'Add to watchlist'}
            hitSlop={10}
            onPress={() => watchlist.toggle('SOL-USDT')}>
            <Image
              source={
                starred
                  ? require('@/assets/images/market/icon-star-filled.svg')
                  : require('@/assets/images/market/icon-star.svg')
              }
              className="size-5"
            />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className="gap-1.5 px-4 pt-2">
          <View className="flex-row items-center gap-2">
            <View className="size-6 items-center justify-center rounded-xl bg-[#14f195]">
              <Text className="font-inter-bold text-[11px] text-canvas">S</Text>
            </View>
            <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">YOUR BALANCE</Text>
          </View>
          <Text className="font-jetbrains-bold text-[34px] leading-[42px] text-ink">
            {lamports === null ? '—' : mask(`${formatLamports(lamports, 4)} SOL`)}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-jetbrains-medium text-[15px] leading-5 text-ink-muted">
              {fiat === null ? '' : mask(fx.format(fiat, 2))}
            </Text>
            <Text className={`font-jetbrains-medium text-[12px] leading-5 ${down ? 'text-sell' : 'text-buy'}`}>
              {formatChange(change)}
            </Text>
          </View>
        </View>

        <View className="px-4 pt-4">
          <Sparkline values={history} color={down ? '#f6465d' : '#2ebd85'} />
        </View>

        <View className="flex-row items-center px-4 pt-4">
          <Text className="flex-1 font-jetbrains text-[13px] leading-5 text-ink-muted">SOL-USDT</Text>
          <Text className="font-jetbrains-medium text-[13px] leading-5 text-ink">
            {price === null ? '—' : formatPrice(price, 3)}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/market/SOL-USDT')}>
            <Text className="pl-3 font-inter-medium text-[13px] leading-5 text-accent">View market</Text>
          </Pressable>
        </View>

        <View className="flex-row px-4 pb-1 pt-5">
          <Action label="Send" icon={require('@/assets/images/portfolio/action-send.svg')} onPress={() => router.push('/send')} />
          <Action label="Receive" icon={require('@/assets/images/portfolio/action-receive.svg')} onPress={() => router.push('/receive')} />
          <Action label="Swap" icon={require('@/assets/images/portfolio/action-swap.svg')} onPress={() => router.push('/swap')} />
        </View>

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
            <Text className="font-inter text-[13px] leading-5 text-ink-muted">No transactions yet.</Text>
          </View>
        ) : (
          activity.map((item) => <ActivityRow key={item.signature} item={item} mask={mask} />)
        )}
      </ScrollView>
    </View>
  );
}
