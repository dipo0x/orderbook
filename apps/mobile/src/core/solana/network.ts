import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { CLUSTERS, type Cluster } from './config';

const KEY = 'orderbook:cluster:v1';

// The wallet starts on devnet (test funds). Mainnet is only used after the user chooses it.
let cluster: Cluster = 'devnet';
let ready = false;
const listeners = new Set<() => void>();

type Snapshot = { cluster: Cluster; ready: boolean };
let snapshot: Snapshot = { cluster, ready };

function publish() {
  snapshot = { cluster, ready };
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(KEY)
  .then((saved) => {
    if (saved === 'devnet' || saved === 'testnet' || saved === 'mainnet-beta') cluster = saved;
  })
  .catch(() => {})
  .finally(() => {
    ready = true;
    publish();
  });

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getCluster = (): Cluster => cluster;
export const getRpcUrl = (): string => CLUSTERS[cluster].rpcUrl;

export function setCluster(next: Cluster) {
  if (next === cluster) return;
  cluster = next;
  publish();
  AsyncStorage.setItem(KEY, next).catch(() => {});
}

/** The selected network. `ready` is false until the saved choice has loaded. */
export function useNetwork(): Snapshot & { isTestnet: boolean; label: string } {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  return { ...current, isTestnet: CLUSTERS[current.cluster].testFunds, label: CLUSTERS[current.cluster].label };
}
