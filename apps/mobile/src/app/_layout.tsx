import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import '@/global.css';

SplashScreen.preventAutoHideAsync();

// Navigation theme needs a JS color; keep in sync with --color-canvas in global.css.
const CANVAS = '#0b0e11';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: CANVAS, card: CANVAS },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* Nothing to swipe back to from an unlock screen. */}
        <Stack.Screen name="unlock" options={{ gestureEnabled: false }} />
        <Stack.Screen name="unlock-pin" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
