import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OptionSheet } from '@/components/ui/option-sheet';
import { SettingsRow } from '@/components/ui/settings-row';
import { SwitchRow } from '@/components/ui/switch-row';
import { WalletScreen } from '@/features/wallet/wallet-screen';
import {
  type AutoLock,
  type CurrencyCode,
  type DefaultMarket,
  type Settings,
  updateSettings,
  useSettings,
} from '@/lib/settings';

import { AUTO_LOCK_OPTIONS, autoLockLabel } from './auto-lock-options';
import { useBiometricSetting } from './use-biometric-setting';

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'NGN', label: 'NGN' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];
const MARKET_OPTIONS: { value: DefaultMarket; label: string }[] = [
  { value: 'BTC-USDT', label: 'BTC-USDT' },
  { value: 'ETH-USDT', label: 'ETH-USDT' },
  { value: 'SOL-USDT', label: 'SOL-USDT' },
  { value: 'last', label: 'Last viewed' },
];
const DEPTH_OPTIONS: { value: Settings['bookDepth']; label: string }[] = [
  { value: 5, label: '5 levels' },
  { value: 10, label: '10 levels' },
  { value: 15, label: '15 levels' },
  { value: 25, label: '25 levels' },
];

type Sheet = 'autoLock' | 'currency' | 'market' | 'depth' | null;

function Group({ label }: { label: string }) {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function SettingsScreen() {
  const settings = useSettings();
  const biometric = useBiometricSetting();
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);
  const version = Constants.expoConfig?.version ?? '—';
  const build = Constants.expoConfig?.ios?.buildNumber;

  return (
    <>
      <WalletScreen title="Settings" onBack={() => router.back()} gap={4}>
        <View className="-mx-6">
          <Group label="SECURITY" />
          <SwitchRow
            label="Unlock with Face ID"
            icon={require('@/assets/images/wallet/icon-face-id.svg')}
            value={biometric.enabled === true}
            disabled={biometric.enabled === null}
            onValueChange={(next) => void biometric.toggle(next)}
          />
          <SwitchRow
            label="Require Face ID to send"
            icon={require('@/assets/images/wallet/icon-lock.svg')}
            value={biometric.enabled === true && settings.faceIdToSend}
            disabled={biometric.enabled !== true}
            onValueChange={(value) => updateSettings({ faceIdToSend: value })}
          />
          <SettingsRow
            label="Auto-lock"
            icon={require('@/assets/images/wallet/icon-lock.svg')}
            value={autoLockLabel(settings.autoLock)}
            onPress={() => setSheet('autoLock')}
          />
          <SettingsRow
            label="Recovery phrase"
            icon={require('@/assets/images/profile/icon-key.svg')}
            onPress={() => router.push('/recovery-phrase')}
          />

          <Group label="DISPLAY" />
          <SettingsRow
            label="Currency"
            icon={require('@/assets/images/profile/icon-globe.svg')}
            value={settings.currency}
            onPress={() => setSheet('currency')}
          />
          <SwitchRow
            label="Hide balances"
            icon={require('@/assets/images/profile/icon-eye.svg')}
            value={settings.hideBalances}
            onValueChange={(value) => updateSettings({ hideBalances: value })}
          />

          <Group label="MARKET DATA" />
          <SettingsRow
            label="Default market"
            icon={require('@/assets/images/profile/icon-chart.svg')}
            value={settings.defaultMarket === 'last' ? 'Last viewed' : settings.defaultMarket}
            onPress={() => setSheet('market')}
          />
          <SettingsRow
            label="Order book depth"
            icon={require('@/assets/images/profile/icon-chart.svg')}
            value={`${settings.bookDepth} levels`}
            onPress={() => setSheet('depth')}
          />
          <SwitchRow
            label="Flash on price change"
            icon={require('@/assets/images/profile/icon-clock.svg')}
            value={settings.flashOnChange}
            onValueChange={(value) => updateSettings({ flashOnChange: value })}
          />

          <Group label="ABOUT" />
          <SettingsRow
            label="Version"
            icon={require('@/assets/images/profile/icon-info.svg')}
            value={build ? `${version} (build ${build})` : version}
            onPress={() => router.push('/about')}
          />
          <SettingsRow
            label="Open source licences"
            icon={require('@/assets/images/profile/icon-info.svg')}
            onPress={() => router.push('/licences')}
          />
        </View>
      </WalletScreen>

      <OptionSheet
        title="Auto-lock"
        visible={sheet === 'autoLock'}
        options={AUTO_LOCK_OPTIONS}
        selected={settings.autoLock}
        onSelect={(autoLock: AutoLock) => updateSettings({ autoLock })}
        onClose={close}
      />
      <OptionSheet
        title="Currency"
        visible={sheet === 'currency'}
        options={CURRENCY_OPTIONS}
        selected={settings.currency}
        onSelect={(currency) => updateSettings({ currency })}
        onClose={close}
      />
      <OptionSheet
        title="Default market"
        visible={sheet === 'market'}
        options={MARKET_OPTIONS}
        selected={settings.defaultMarket}
        onSelect={(defaultMarket) => updateSettings({ defaultMarket })}
        onClose={close}
      />
      <OptionSheet
        title="Order book depth"
        visible={sheet === 'depth'}
        options={DEPTH_OPTIONS}
        selected={settings.bookDepth}
        onSelect={(bookDepth) => updateSettings({ bookDepth })}
        onClose={close}
      />
    </>
  );
}
