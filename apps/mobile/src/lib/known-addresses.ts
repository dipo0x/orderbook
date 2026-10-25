import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'orderbook:known-addresses:v1';

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Whether money has been sent to this address from this phone before. */
export async function isKnownAddress(address: string): Promise<boolean> {
  return (await read()).includes(address);
}

export async function rememberAddress(address: string): Promise<void> {
  const known = await read();
  if (known.includes(address)) return;
  await AsyncStorage.setItem(KEY, JSON.stringify([...known, address].slice(-200))).catch(() => {});
}

/** Every address money has been sent to from this phone. */
export const knownAddresses = read;
