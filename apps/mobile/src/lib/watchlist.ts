import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'orderbook:watchlist:v1';

let ids: readonly string[] = [];
let ready = false;
const listeners = new Set<() => void>();

function emit(next: readonly string[]) {
  ids = next;
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(KEY)
  .then((raw) => {
    ready = true;
    emit(raw ? (JSON.parse(raw) as string[]) : ids);
  })
  .catch(() => {
    ready = true;
    emit(ids);
  });

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleWatchlist(instId: string) {
  const next = ids.includes(instId) ? ids.filter((id) => id !== instId) : [...ids, instId];
  emit(next);
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

/** Saved market ids, newest last. Persisted on the device. `ready` is false until they have loaded. */
export function useWatchlist() {
  const current = useSyncExternalStore(subscribe, () => ids);
  const loaded = useSyncExternalStore(subscribe, () => ready);
  const has = useCallback((instId: string) => current.includes(instId), [current]);
  return { ids: current, ready: loaded, has, toggle: toggleWatchlist };
}
