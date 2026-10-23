import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const KEY = 'orderbook:recent-searches:v1';
const MAX_RECENTS = 8;

let recents: readonly string[] = [];
const listeners = new Set<() => void>();

function emit(next: readonly string[]) {
  recents = next;
  listeners.forEach((listener) => listener());
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    recents = JSON.parse(raw) as string[];
    listeners.forEach((listener) => listener());
  })
  .catch(() => {});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Puts a search (or a market id) at the top of the list, without duplicates. */
export function addRecentSearch(text: string) {
  const value = text.trim();
  if (!value) return;
  const others = recents.filter((item) => item.toLowerCase() !== value.toLowerCase());
  emit([value, ...others].slice(0, MAX_RECENTS));
}

export function removeRecentSearch(text: string) {
  emit(recents.filter((item) => item !== text));
}

export function useRecentSearches(): readonly string[] {
  return useSyncExternalStore(subscribe, () => recents);
}
