import AsyncStorage from '@react-native-async-storage/async-storage';

const WALLET_SKIPPED_KEY = 'orderbook:wallet-setup-skipped:v1';

/** True once the user chose Skip on the wallet setup screen. */
export async function hasSkippedWalletSetup(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WALLET_SKIPPED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function skipWalletSetup(): Promise<void> {
  try {
    await AsyncStorage.setItem(WALLET_SKIPPED_KEY, '1');
  } catch {
    // Not persisting only means setup is offered again next launch.
  }
}

/** Dev helper: forget that wallet setup was skipped, so the intro shows again. */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALLET_SKIPPED_KEY);
  } catch {
    // Nothing to reset.
  }
}
