import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const KEY = 'orderbook:settings:v2';

export type AutoLock = 'immediately' | '1' | '5' | '15';
export type CurrencyCode = 'USD' | 'NGN' | 'EUR' | 'GBP';
export type DefaultMarket = 'BTC-USDT' | 'ETH-USDT' | 'SOL-USDT' | 'last';

export type Settings = {
  /** Sign transfers with Face ID. Off means the PIN is asked instead. */
  faceIdToSend: boolean;
  /** Extra confirmation the first time money goes to an address. */
  warnNewAddresses: boolean;
  autoLock: AutoLock;
  currency: CurrencyCode;
  hideBalances: boolean;
  /** The market the app opens on at launch. */
  defaultMarket: DefaultMarket;
  /** The most recently opened market, used when defaultMarket is 'last'. */
  lastMarket: string | null;
  /** Most rows shown on each side of the order book. */
  bookDepth: 5 | 10 | 15 | 25;
  flashOnChange: boolean;
  /** Notification preferences. Saved now; nothing is delivered until push is wired up. */
  notifyConfirmed: boolean;
  notifyIncoming: boolean;
  notifyPriceAlerts: boolean;
  notifyNewSignIn: boolean;
  notifyLargeTransfer: boolean;
};

const DEFAULTS: Settings = {
  faceIdToSend: true,
  warnNewAddresses: true,
  autoLock: '1',
  currency: 'USD',
  hideBalances: false,
  defaultMarket: 'BTC-USDT',
  lastMarket: null,
  bookDepth: 15,
  flashOnChange: true,
  notifyConfirmed: true,
  notifyIncoming: true,
  notifyPriceAlerts: true,
  notifyNewSignIn: true,
  notifyLargeTransfer: true,
};

export const AUTO_LOCK_MS: Record<AutoLock, number> = {
  immediately: 0,
  '1': 60_000,
  '5': 5 * 60_000,
  '15': 15 * 60_000,
};

let settings: Settings = DEFAULTS;
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    settings = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
    listeners.forEach((listener) => listener());
  })
  .catch(() => {});

export const getSettings = (): Settings => settings;

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  listeners.forEach((listener) => listener());
  void AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => settings, () => DEFAULTS);
}
