import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { WalletScreen } from '@/features/wallet/wallet-screen';

export type InfoSection = { heading: string; body: string };

/** A plain reading screen: a title and a few headed paragraphs. */
export function InfoScreen({ title, sections }: { title: string; sections: InfoSection[] }) {
  return (
    <WalletScreen title={title} onBack={() => router.back()} gap={6}>
      {sections.map(({ heading, body }) => (
        <View key={heading} className="gap-1.5">
          <Text className="font-inter-semibold text-[16px] leading-6 text-ink">{heading}</Text>
          <Text className="font-inter text-[13px] leading-5 text-ink-muted">{body}</Text>
        </View>
      ))}
    </WalletScreen>
  );
}
