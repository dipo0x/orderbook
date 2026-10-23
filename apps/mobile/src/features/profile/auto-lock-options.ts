import type { AutoLock } from '@/lib/settings';

export const AUTO_LOCK_OPTIONS: { value: AutoLock; label: string }[] = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1', label: 'After 1 min' },
  { value: '5', label: 'After 5 min' },
  { value: '15', label: 'After 15 min' },
];

export const autoLockLabel = (value: AutoLock) => AUTO_LOCK_OPTIONS.find((o) => o.value === value)?.label ?? '';
