import { Text, View } from 'react-native';

export type PillStatus = 'live' | 'connecting' | 'resyncing' | 'reconnecting';

const STYLE: Record<PillStatus, { label: string; frame: string; dot: string; text: string }> = {
  live: { label: 'LIVE', frame: 'bg-live-bg', dot: 'bg-buy', text: 'text-buy' },
  connecting: { label: 'CONNECTING', frame: 'bg-accent-bg', dot: 'bg-accent', text: 'text-accent' },
  resyncing: { label: 'RESYNCING', frame: 'bg-accent-bg', dot: 'bg-accent', text: 'text-accent' },
  reconnecting: { label: 'RECONNECTING', frame: 'bg-sell-bg', dot: 'bg-sell', text: 'text-sell' },
};

/** Connection status pill. One variant per state of the useMarket hook. */
export function StatusPill({ status = 'live' }: { status?: PillStatus }) {
  const { label, frame, dot, text } = STYLE[status];

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 ${frame}`}>
      <View className={`size-1.5 rounded-full ${dot}`} />
      <Text className={`font-inter-medium text-[11px] leading-4 tracking-[0.4px] ${text}`}>
        {label}
      </Text>
    </View>
  );
}
