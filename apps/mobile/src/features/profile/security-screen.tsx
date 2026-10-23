import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Callout } from '@/components/ui/callout';
import { OptionSheet } from '@/components/ui/option-sheet';
import { SettingsRow } from '@/components/ui/settings-row';
import { SwitchRow } from '@/components/ui/switch-row';
import { WalletScreen } from '@/features/wallet/wallet-screen';
import { updateSettings, useSettings } from '@/lib/settings';

import { AUTO_LOCK_OPTIONS, autoLockLabel } from './auto-lock-options';
import { useBiometricSetting } from './use-biometric-setting';

function Group({ label }: { label: string }) {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text className="font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function SecurityScreen() {
  const settings = useSettings();
  const biometric = useBiometricSetting();
  const [autoLockOpen, setAutoLockOpen] = useState(false);

  return (
    <>
      <WalletScreen title="Security" onBack={() => router.back()} gap={4}>
        <View className="-mx-6">
          <Group label="UNLOCKING" />
          <SwitchRow
            label="Unlock with Face ID"
            icon={require('@/assets/images/wallet/icon-face-id.svg')}
            value={biometric.enabled === true}
            disabled={biometric.enabled === null}
            onValueChange={(next) => void biometric.toggle(next)}
          />
          <SettingsRow
            label="Auto-lock"
            icon={require('@/assets/images/wallet/icon-lock.svg')}
            value={autoLockLabel(settings.autoLock)}
            onPress={() => setAutoLockOpen(true)}
          />
          <SettingsRow
            label="Change PIN"
            icon={require('@/assets/images/profile/icon-key.svg')}
            onPress={() => router.push('/change-pin')}
          />

          <Group label="SIGNING" />
          <SwitchRow
            label="Require Face ID to send"
            icon={require('@/assets/images/wallet/icon-shield.svg')}
            value={biometric.enabled === true && settings.faceIdToSend}
            disabled={biometric.enabled !== true}
            onValueChange={(value) => updateSettings({ faceIdToSend: value })}
          />
          <SwitchRow
            label="Warn on new addresses"
            icon={require('@/assets/images/profile/icon-qr.svg')}
            value={settings.warnNewAddresses}
            onValueChange={(value) => updateSettings({ warnNewAddresses: value })}
          />

          <Group label="BACKUP" />
          <SettingsRow
            label="View recovery phrase"
            icon={require('@/assets/images/profile/icon-key.svg')}
            onPress={() => router.push('/recovery-phrase')}
          />
        </View>
        <Callout tone="danger">
          Viewing the phrase requires Face ID and blocks screenshots. Nobody from this app will ever
          ask you for it.
        </Callout>

        <View className="-mx-6">
          <Group label="DANGER ZONE" />
          <SettingsRow
            label="Remove wallet from this phone"
            icon={require('@/assets/images/profile/icon-trash.svg')}
            onPress={() => router.push('/remove-wallet')}
            destructive
          />
        </View>
        <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
          Removing wipes the encrypted key from the keychain. Without your written phrase the funds are
          gone for good, so you type a confirmation first.
        </Text>
      </WalletScreen>

      <OptionSheet
        title="Auto-lock"
        visible={autoLockOpen}
        options={AUTO_LOCK_OPTIONS}
        selected={settings.autoLock}
        onSelect={(autoLock) => updateSettings({ autoLock })}
        onClose={() => setAutoLockOpen(false)}
      />
    </>
  );
}
