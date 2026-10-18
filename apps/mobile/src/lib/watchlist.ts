import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'orderbook:watchlist:v1';

let ids: readonly string[] = [];
const listeners = new Set<() => void>();

function emit(next: readonly string[]) {
  ids = next;
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) emit(JSON.parse(raw) as string[]);
  })
  .catch(() => {});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleWatchlist(instId: string) {
  const next = ids.includes(instId) ? ids.filter((id) => id !== instId) : [...ids, instId];
  emit(next);
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

/** Saved market ids, newest last. Persisted on the device. */
export function useWatchlist() {
  const current = useSyncExternalStore(subscribe, () => ids);
  const has = useCallback((instId: string) => current.includes(instId), [current]);
  return { ids: current, has, toggle: toggleWatchlist };
}
