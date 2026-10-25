import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { LogoMark } from '@/components/ui/logo-mark';

/**
 * Covers the app while it is not active, so the iOS app switcher shows the logo instead of balances
 * or a recovery phrase. (The system Face ID prompt also makes the app inactive, which is fine.)
 */
export function PrivacyCover() {
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  if (active) return null;
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-canvas">
      <LogoMark />
    </View>
  );
}
