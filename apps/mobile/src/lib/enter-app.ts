import { router } from 'expo-router';

/** Opens the app after unlock, setup or onboarding. */
export function enterApp() {
  router.replace('/(tabs)/markets');
}
