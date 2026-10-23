import { useCallback, useEffect, useState } from 'react';

import {
  type ParsedActivity,
  type TokenBalance,
  getBalance,
  getRecentActivity,
  getTokenBalances,
} from '@/core/solana/rpc';
import type { Cluster } from '@/core/solana/config';
import { useNetwork } from '@/core/solana/network';
import { type WalletMeta, getWalletMeta } from '@/core/wallet/storage';

const BALANCE_POLL_MS = 15_000;

/** The wallet saved on this device. `undefined` while it loads, `null` if there isn't one. */
export function useWalletMeta(): WalletMeta | null | undefined {
  const [meta, setMeta] = useState<WalletMeta | null | undefined>(undefined);
  useEffect(() => {
    void getWalletMeta().then(setMeta);
  }, []);
  return meta;
}

type Loaded = {
  cluster: Cluster;
  lamports: bigint | null;
  tokens: TokenBalance[];
  activity: ParsedActivity[];
};

const NOTHING: Omit<Loaded, 'cluster'> = { lamports: null, tokens: [], activity: [] };

/** SOL balance, SPL token balances and recent activity for an address, read from the chosen network. */
export function useWalletData(address: string | undefined) {
  const { cluster, ready } = useNetwork();
  const [data, setData] = useState<Loaded>({ cluster, ...NOTHING });
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [loadedVersion, setLoadedVersion] = useState(-1);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // The SOL balance is cheap, so it is polled. Tokens and history load on open and on refresh.
  useEffect(() => {
    if (!address || !ready) return;
    let cancelled = false;
    const loadBalance = () =>
      getBalance(address)
        .then((value) => {
          if (cancelled) return;
          setData((prev) => ({ ...(prev.cluster === cluster ? prev : { cluster, ...NOTHING }), lamports: value }));
          setError(null);
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        });
    void loadBalance();
    const timer = setInterval(() => void loadBalance(), BALANCE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address, ready, cluster, version]);

  useEffect(() => {
    if (!address || !ready) return;
    let cancelled = false;
    Promise.allSettled([getTokenBalances(address), getRecentActivity(address, 3)]).then(
      ([tokenResult, activityResult]) => {
        if (cancelled) return;
        setData((prev) => {
          const base = prev.cluster === cluster ? prev : { cluster, ...NOTHING };
          return {
            ...base,
            tokens: tokenResult.status === 'fulfilled' ? tokenResult.value.filter((t) => t.amount > 0n) : base.tokens,
            activity: activityResult.status === 'fulfilled' ? activityResult.value : base.activity,
          };
        });
        setLoadedVersion(version);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [address, ready, cluster, version]);

  // Data from the other network is never shown: switching networks starts from a blank slate.
  const current = data.cluster === cluster ? data : { cluster, ...NOTHING };
  const refreshing = address !== undefined && loadedVersion !== version;

  return { lamports: current.lamports, tokens: current.tokens, activity: current.activity, error, refreshing, refresh };
}
