import { SettingsRow } from '@/components/ui/settings-row';
import { Toggle } from '@/components/ui/toggle';

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
      trailing={<Toggle label={label} value={value} onValueChange={onValueChange} disabled={disabled} />}
    />
  );
}
