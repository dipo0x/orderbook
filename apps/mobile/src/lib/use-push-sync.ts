import { useEffect } from 'react';

import { useNetwork } from '@/core/solana/network';

import { isPushRegistered, prefsFrom, syncPush } from './push';
import { getSettings, settingsLoaded, updateSettings, useSettings } from './settings';

/**
 * Keeps the backend's record of this phone current: when the network or the alert choices change,
 * a phone that has already signed up is updated. It never asks for permission by itself.
 */
export function usePushSync() {
  // At start-up, a switch must not claim alerts are on when this phone isn't signed up (an older
  // version, a failed sign-up, a removed wallet). Done once: later changes are handled below.
  useEffect(() => {
    void settingsLoaded.then(async () => {
      if (await isPushRegistered()) return;
      if (Object.values(prefsFrom(getSettings())).some(Boolean)) {
        updateSettings({
          notifyConfirmed: false,
          notifyIncoming: false,
          notifyPriceAlerts: false,
          notifyNewSignIn: false,
          notifyLargeTransfer: false,
        });
      }
    });
  }, []);

  const settings = useSettings();
  const { cluster, ready } = useNetwork();
  const prefs = JSON.stringify(prefsFrom(settings));

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void isPushRegistered().then((registered) => {
        if (registered) void syncPush();
      });
    }, 1_500);
    return () => clearTimeout(timer);
  }, [cluster, ready, prefs]);
}
