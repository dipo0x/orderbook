import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getWalletMeta } from '@/core/wallet/storage';

import { AUTO_LOCK_MS, getSettings } from './settings';

// Routes where the wallet is already locked, or not set up yet, so there is nothing to lock.
const UNLOCKED_ONLY = (path: string) =>
  path === '/' || path.startsWith('/unlock') || path.startsWith('/onboarding') || path.startsWith('/setup');

/**
 * Sends the user back to the unlock screen after the app has been in the background for the chosen
 * auto-lock time. The system Face ID prompt only makes the app "inactive", so it never triggers this.
 */
export function useAutoLock() {
  const pathname = usePathname();
  const path = useRef(pathname);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        leftAt.current = Date.now();
        return;
      }
      if (state !== 'active' || leftAt.current === null) return;
      const away = Date.now() - leftAt.current;
      leftAt.current = null;
      if (away < AUTO_LOCK_MS[getSettings().autoLock] || UNLOCKED_ONLY(path.current)) return;
      void getWalletMeta().then((meta) => {
        if (meta) router.replace(meta.biometric ? '/unlock' : '/unlock-pin');
      });
    });
    return () => subscription.remove();
  }, []);
}
