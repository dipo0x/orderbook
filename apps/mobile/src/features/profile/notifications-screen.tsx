import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { SwitchRow } from '@/components/ui/switch-row';
import { WalletScreen } from '@/features/wallet/wallet-screen';
import { syncPush } from '@/lib/push';
import { type Settings, updateSettings, useSettings } from '@/lib/settings';

type Key = 'notifyConfirmed' | 'notifyIncoming' | 'notifyPriceAlerts' | 'notifyNewSignIn' | 'notifyLargeTransfer';

function Group({ label }: { label: string }) {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function NotificationsScreen() {
  const settings = useSettings();

  // Saves the choice, then tells the backend. If signing up fails (no permission, no server), the switch goes back.
  async function change(key: Key, value: boolean) {
    updateSettings({ [key]: value } as Partial<Settings>);
    const result = await syncPush();
    if (!result.ok) {
      updateSettings({ [key]: !value } as Partial<Settings>);
      Alert.alert("Couldn't turn on alerts", result.message);
    }
  }

  const toggle = (label: string, icon: number, key: Key) => (
    <SwitchRow label={label} icon={icon} value={settings[key]} onValueChange={(value) => void change(key, value)} />
  );

  return (
    <WalletScreen title="Notifications" onBack={() => router.back()} gap={4}>
      <View className="-mx-6">
        <Group label="ACTIVITY" />
        {toggle('Transaction confirmed', require('@/assets/images/profile/icon-check.svg'), 'notifyConfirmed')}
        {toggle('Incoming transfers', require('@/assets/images/portfolio/action-receive.svg'), 'notifyIncoming')}
        {toggle('Price alerts', require('@/assets/images/profile/icon-bell.svg'), 'notifyPriceAlerts')}
        <Group label="SECURITY" />
        {toggle('New sign-in on this phone', require('@/assets/images/wallet/icon-shield.svg'), 'notifyNewSignIn')}
        {toggle('Large transfer warning', require('@/assets/images/profile/icon-warning.svg'), 'notifyLargeTransfer')}
      </View>
      <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
        Alerts never include your recovery phrase or full balances. They are sent by the backend, which watches your public address.
      </Text>
    </WalletScreen>
  );
}
