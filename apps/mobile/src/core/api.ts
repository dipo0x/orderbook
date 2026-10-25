/**
 * The optional backend (apps/api). When EXPO_PUBLIC_API_URL is set the app sends Solana requests,
 * price lookups, risk checks and notification sign-ups through it. Without it the app talks to the
 * public services directly, so it keeps working with no server running.
 */
const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;

export const apiBaseUrl = BASE;
export const hasApi = BASE !== null;

/** Calls the backend. Throws on a network failure; the caller decides what to do about it. */
export async function apiFetch(path: string, init?: RequestInit, timeoutMs = 8_000): Promise<Response> {
  if (!BASE) throw new Error('No API configured');
  return fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

/** JSON helper for POST/DELETE. */
export function apiJson(path: string, body: unknown, method: 'POST' | 'DELETE' = 'POST', timeoutMs?: number) {
  return apiFetch(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs);
}
