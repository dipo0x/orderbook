import { sha256 } from '@noble/hashes/sha2.js';
import * as Clipboard from 'expo-clipboard';
import { AppState } from 'react-native';

export const SENSITIVE_CLIPBOARD_TTL_MS = 2 * 60 * 1000;

type Pending = { digest: string; expiresAt: number; timer: ReturnType<typeof setTimeout> };

let pending: Pending | null = null;

// Only a hash is kept, so the secret itself is not held in memory just to be compared later.
function digest(text: string): string {
  const bytes = sha256(Uint8Array.from(text, (char) => char.charCodeAt(0)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Empties the clipboard, but only if it still holds what we copied. */
async function clearIfStillOurs() {
  if (!pending) return;
  const { digest: expected } = pending;
  pending = null;
  try {
    const current = await Clipboard.getStringAsync();
    if (current && digest(current) === expected) await Clipboard.setStringAsync('');
  } catch {
    // Clipboard unavailable: nothing more we can do.
  }
}

// JS timers can be suspended while the app is in the background, so check again on return.
AppState.addEventListener('change', (state) => {
  if (state === 'active' && pending && Date.now() >= pending.expiresAt) {
    clearTimeout(pending.timer);
    void clearIfStillOurs();
  }
});

/** Copies a secret and clears it from the clipboard after `ttlMs` (default 2 minutes). */
export async function copySensitive(text: string, ttlMs = SENSITIVE_CLIPBOARD_TTL_MS) {
  if (pending) clearTimeout(pending.timer);
  await Clipboard.setStringAsync(text, { android: { isSensitive: true } });
  pending = {
    digest: digest(text),
    expiresAt: Date.now() + ttlMs,
    timer: setTimeout(() => void clearIfStillOurs(), ttlMs),
  };
}
