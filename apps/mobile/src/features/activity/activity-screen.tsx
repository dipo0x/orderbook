import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetwork } from '@/core/solana/network';
import { type ParsedActivity, getRecentActivity } from '@/core/solana/rpc';
import { useWalletMeta } from '@/features/portfolio/use-wallet-data';
import { useSettings } from '@/lib/settings';

import { ActivityRow } from './activity-row';
import { dayHeading, kindOf } from './format';

const FILTERS = ['All', 'Sent', 'Received'] as const;
type Filter = (typeof FILTERS)[number];

export function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const meta = useWalletMeta();
  const address = meta?.address;
  const { cluster, ready, isTestnet } = useNetwork();
  const { hideBalances } = useSettings();
  const [filter, setFilter] = useState<Filter>('All');
  const [loaded, setLoaded] = useState<{ cluster: string; items: ParsedActivity[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);

  // Reload whenever the tab is focused, so a send you just made shows up straight away.
  useFocusEffect(
    useCallback(() => {
      setVersion((v) => v + 1);
    }, []),
  );

  const load = useCallback(
    (isCancelled: () => boolean) => {
      if (!address || !ready) return Promise.resolve();
      return getRecentActivity(address, 25)
        .then((items) => {
          if (isCancelled()) return;
          setLoaded({ cluster, items });
          setFailed(false);
        })
        .catch(() => {
          if (!isCancelled()) setFailed(true);
        });
    },
    [address, ready, cluster],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load, version]);

  const items = loaded?.cluster === cluster ? loaded.items : null;
  const sections = useMemo(() => {
    if (!items) return [];
    const now = new Date();
    const groups: { heading: string; rows: ParsedActivity[] }[] = [];
    for (const item of items) {
      if (filter !== 'All' && kindOf(item) !== filter.toLowerCase()) continue;
      const heading = dayHeading(item.blockTime, now);
      const last = groups[groups.length - 1];
      if (last?.heading === heading) last.rows.push(item);
      else groups.push({ heading, rows: [item] });
    }
    return groups;
  }, [items, filter]);

  const mask = (text: string) => (hideBalances ? '••••' : text);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#7d8590"
          onRefresh={() => {
            setRefreshing(true);
            void load(() => false).finally(() => setRefreshing(false));
          }}
        />
      }>
      <View className="px-4 pb-3 pt-2">
        <Text className="font-inter-bold text-[30px] leading-9 text-ink">Activity</Text>
      </View>

      <View className="flex-row gap-2 px-4 pb-1">
        {FILTERS.map((name) => {
          const selected = name === filter;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(name)}
              className={`h-8 items-center justify-center rounded-full px-3.5 ${
                selected ? 'bg-accent' : 'border border-line bg-surface'
              }`}>
              <Text className={`font-inter-medium text-[13px] leading-5 ${selected ? 'text-canvas' : 'text-ink-muted'}`}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {meta === null ? (
        <Message text="No wallet on this phone yet." />
      ) : failed && !items ? (
        <Message text="Couldn't reach the network. Pull down to try again." />
      ) : !items ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#7d8590" />
        </View>
      ) : sections.length === 0 ? (
        <Message
          text={
            filter === 'All'
              ? isTestnet
                ? 'No transactions yet. Get some test SOL from the faucet on the Wallet tab.'
                : 'No transactions yet.'
              : `No ${filter.toLowerCase()} transactions.`
          }
        />
      ) : (
        sections.map(({ heading, rows }) => (
          <View key={heading}>
            <View className="px-4 pb-1.5 pt-[18px]">
              <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{heading}</Text>
            </View>
            {rows.map((item) => (
              <ActivityRow key={item.signature} item={item} mask={mask} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Message({ text }: { text: string }) {
  return (
    <View className="px-6 py-10">
      <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">{text}</Text>
    </View>
  );
}
