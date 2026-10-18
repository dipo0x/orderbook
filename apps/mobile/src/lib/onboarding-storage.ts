import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'orderbook:onboarding-complete:v1';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Not persisting only means the intro shows again next launch.
  }
}

/** Dev helper: forget that onboarding was seen so the intro shows again. */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to reset.
  }
}
