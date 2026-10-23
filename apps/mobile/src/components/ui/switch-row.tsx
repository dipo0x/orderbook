import { Switch } from 'react-native';

import { SettingsRow } from '@/components/ui/settings-row';

type SwitchRowProps = {
  label: string;
  icon: number;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** A settings row whose right side is an on/off switch. */
export function SwitchRow({ label, icon, value, onValueChange, disabled }: SwitchRowProps) {
  return (
    <SettingsRow
      label={label}
      icon={icon}
      trailing={
        <Switch
          accessibilityLabel={label}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
          trackColor={{ true: '#2ebd85', false: '#2f3742' }}
        />
      }
    />
  );
}
