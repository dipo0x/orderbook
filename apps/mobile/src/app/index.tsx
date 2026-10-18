import { router } from 'expo-router';
import { useEffect } from 'react';

import { SplashView } from '@/features/onboarding/splash-view';
import { hasCompletedOnboarding, resetOnboarding } from '@/lib/onboarding-storage';

const MIN_SPLASH_MS = 3000;

/** Entry route: shows the brand splash, then sends first-time users to onboarding. */
export default function Index() {
  useEffect(() => {
    let cancelled = false;

    async function route() {
      // Start the dev server with EXPO_PUBLIC_RESET_ONBOARDING=1 to see the intro again.
      if (__DEV__ && process.env.EXPO_PUBLIC_RESET_ONBOARDING === '1') await resetOnboarding();
      const [done] = await Promise.all([
        hasCompletedOnboarding(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);
      if (!cancelled) router.replace(done ? '/(tabs)/home' : '/onboarding');
    }
    void route();

    return () => {
      cancelled = true;
    };
  }, []);

  return <SplashView />;
}
