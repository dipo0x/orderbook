import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Image } from '@/components/ui/image';
import { formatLamports } from '@/core/solana/amount';
import { shortAddress } from '@/core/solana/address';
import type { ParsedActivity } from '@/core/solana/rpc';

import { clock, kindOf } from './format';

/** One transaction in a list. Opens the transaction detail. `mask` hides amounts when balances are hidden. */
export function ActivityRow({ item, mask = (text) => text }: { item: ParsedActivity; mask?: (text: string) => string }) {
  const kind = kindOf(item);
  const received = kind === 'received';
  const frame = item.failed ? 'bg-sell-bg' : received ? 'bg-live-bg' : 'bg-raised';
  const icon = item.failed
    ? require('@/assets/images/portfolio/activity-send-error.svg')
    : received
      ? require('@/assets/images/portfolio/activity-receive.svg')
      : require('@/assets/images/portfolio/activity-send-muted.svg');
  const who = item.counterparty ? `${received ? 'From' : 'To'} ${shortAddress(item.counterparty)}` : shortAddress(item.signature);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/transaction/[signature]', params: { signature: item.signature } })}
      className="h-16 flex-row items-center gap-3 border-b border-line px-4 active:bg-surface">
      <View className={`size-9 items-center justify-center rounded-full ${frame}`}>
        <Image source={icon} className="size-[18px]" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-inter-medium text-[13px] leading-5 text-ink">
          {item.failed ? 'Failed' : received ? 'Received' : 'Sent'}
        </Text>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-muted">
          {who}
          {item.blockTime ? ` · ${clock(item.blockTime)}` : ''}
        </Text>
      </View>
      <Text
        className={`font-jetbrains-medium text-[12px] leading-5 ${
          item.failed ? 'text-sell' : received ? 'text-buy' : 'text-ink'
        }`}>
        {item.failed ? 'Failed' : mask(`${received ? '+' : '−'}${formatLamports(received ? item.lamportDelta : -item.lamportDelta, 4)} SOL`)}
      </Text>
    </Pressable>
  );
}
