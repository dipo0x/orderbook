import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { apiFetch } from '@/core/api';
import { formatPrice } from '@/core/market/format';

import { type CurrencyCode, useSettings } from './settings';

const KEY = 'orderbook:fx:v1';
const MAX_AGE_MS = 6 * 60 * 60_000;

export const CURRENCIES: Record<CurrencyCode, { symbol: string }> = {
  USD: { symbol: '$' },
  NGN: { symbol: '₦' },
  EUR: { symbol: '€' },
  GBP: { symbol: '£' },
};

// Units of each currency per 1 USD. Prices come from OKX in USDT, which is treated as 1 USD.
let rates: Partial<Record<CurrencyCode, number>> = { USD: 1 };
const listeners = new Set<() => void>();

function publish(next: typeof rates) {
  rates = next;
  listeners.forEach((listener) => listener());
}

/** Rates from the backend's cache when there is one, otherwise from the public rates service. */
async function fetchRates(): Promise<{ rates?: Record<string, number> } | null> {
  try {
    const response = await apiFetch('/fx');
    if (response.ok) return (await response.json()) as { rates?: Record<string, number> };
  } catch {
    // No backend, or it is down.
  }
  const response = await fetch('https://open.er-api.com/v6/latest/USD');
  return (await response.json()) as { rates?: Record<string, number> };
}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { at: number; rates: typeof rates }) : null;
    if (saved) publish(saved.rates);
    if (saved && Date.now() - saved.at < MAX_AGE_MS) return;
    const json = await fetchRates();
    if (!json?.rates) return;
    const next: typeof rates = { USD: 1 };
    for (const code of Object.keys(CURRENCIES) as CurrencyCode[]) {
      if (typeof json.rates[code] === 'number') next[code] = json.rates[code];
    }
    publish(next);
    await AsyncStorage.setItem(KEY, JSON.stringify({ at: Date.now(), rates: next }));
  } catch {
    // Without rates, amounts stay in USD.
  }
}
void load();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Formats a USD amount in the chosen currency, falling back to USD until its rate is known. */
export function useFiat() {
  const { currency } = useSettings();
  const current = useSyncExternalStore(subscribe, () => rates);
  const rate = current[currency];
  const code: CurrencyCode = rate ? currency : 'USD';
  const symbol = CURRENCIES[code].symbol;
  return {
    code,
    symbol,
    format: (usd: number, decimals = 2) => `${symbol}${formatPrice(usd * (rate ?? 1), decimals)}`,
  };
}
