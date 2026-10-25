import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationPrefs } from '@orderbook/shared';
import Constants from 'expo-constants';

import { apiJson, hasApi } from '@/core/api';
import { getCluster } from '@/core/solana/network';
import { getWalletMeta } from '@/core/wallet/storage';

import { type Settings, getSettings } from './settings';

const KEY = 'orderbook:push-token:v1';

export type PushResult = { ok: true } | { ok: false; message: string };

/** The notification module is loaded on demand, so the app still runs on a build made before it was added. */
async function notifications() {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export const prefsFrom = (settings: Settings): NotificationPrefs => ({
  confirmed: settings.notifyConfirmed,
  incoming: settings.notifyIncoming,
  priceAlerts: settings.notifyPriceAlerts,
  newSignIn: settings.notifyNewSignIn,
  largeTransfer: settings.notifyLargeTransfer,
});

const anyOn = (prefs: NotificationPrefs) => Object.values(prefs).some(Boolean);

/** Shows alerts even while the app is open. Called once, the first time push is used. */
let handlerSet = false;
async function showWhileOpen() {
  if (handlerSet) return;
  const module = await notifications();
  module?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

async function savedToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Makes the backend's record of this phone match the Notifications settings: asks permission and
 * signs the phone up if any alert is on, updates it if the choices changed, and removes it when all are off.
 */
export async function syncPush(): Promise<PushResult> {
  const prefs = prefsFrom(getSettings());
  const existing = await savedToken();

  if (!anyOn(prefs)) {
    if (existing) await unregisterPush();
    return { ok: true };
  }
  if (!hasApi) return { ok: false, message: 'Alerts need the backend. Set EXPO_PUBLIC_API_URL and restart the app.' };

  const module = await notifications();
  if (!module) return { ok: false, message: 'Notifications are not in this build yet. Rebuild the app with npx expo run:ios.' };

  const meta = await getWalletMeta();
  if (!meta) return { ok: false, message: 'Create or import a wallet first.' };

  const permission = await module.getPermissionsAsync();
  const granted = permission.granted || (await module.requestPermissionsAsync()).granted;
  if (!granted) return { ok: false, message: 'Notifications are turned off for this app in iPhone Settings.' };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return { ok: false, message: 'Push needs an Expo project ID. Run `npx eas init` inside apps/mobile once, then rebuild with ENABLE_PUSH=1.' };
  }

  let token: string;
  try {
    await showWhileOpen();
    token = (await module.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return {
      ok: false,
      message:
        'This build can\'t receive push notifications. They need a paid Apple Developer account and a build made with ENABLE_PUSH=1 (see the README).',
    };
  }

  try {
    const response = await apiJson('/devices', { token, address: meta.address, cluster: getCluster(), prefs });
    if (!response.ok) return { ok: false, message: "The server didn't accept the sign-up. Try again in a moment." };
    await AsyncStorage.setItem(KEY, token);
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }
}

/** Stops alerts: the backend forgets this phone. Also used when the wallet is removed. */
export async function unregisterPush(): Promise<void> {
  const token = await savedToken();
  if (!token) return;
  try {
    if (hasApi) await apiJson('/devices', { token }, 'DELETE');
  } catch {
    // The server drops dead tokens by itself once Apple reports them.
  }
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** True once this phone has signed up for alerts. */
export async function isPushRegistered(): Promise<boolean> {
  return (await savedToken()) !== null;
}
