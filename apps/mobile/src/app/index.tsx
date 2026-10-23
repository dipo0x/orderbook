import { router } from 'expo-router';
import { useEffect } from 'react';

import { SplashView } from '@/features/onboarding/splash-view';
import { getWalletMeta } from '@/core/wallet/storage';
import { hasSkippedWalletSetup, resetOnboarding } from '@/lib/onboarding-storage';
import { enterApp } from '@/lib/enter-app';

const MIN_SPLASH_MS = 3000;

/** Entry route: shows the brand splash, then routes to the unlock screen, onboarding, or the app. */
export default function Index() {
  useEffect(() => {
    let cancelled = false;

    async function route() {
      // Start the dev server with EXPO_PUBLIC_RESET_ONBOARDING=1 to see the intro again.
      if (__DEV__ && process.env.EXPO_PUBLIC_RESET_ONBOARDING === '1') await resetOnboarding();
      const [wallet, skipped] = await Promise.all([
        getWalletMeta(),
        hasSkippedWalletSetup(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);
      if (cancelled) return;

      // A wallet means the app opens locked: Face ID if enabled, otherwise the PIN. Without one,
      // the intro and wallet setup always run, until the user makes a wallet or taps Skip.
      if (wallet) router.replace(wallet.biometric ? '/unlock' : '/unlock-pin');
      else { if (skipped) enterApp(); else router.replace('/onboarding'); };
    }
    void route();

    return () => {
      cancelled = true;
    };
  }, []);

  return <SplashView />;
}
