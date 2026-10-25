import { log } from './log.ts';

export type PushMessage = { to: string; title: string; body: string; data?: Record<string, unknown> };

/**
 * Sends notifications through Expo's push service, which hands them to Apple. Phones that have
 * uninstalled the app are reported back as DeviceNotRegistered and removed via `onDeadToken`.
 */
export function createPushSender(deps: { fetch: typeof fetch; url: string; onDeadToken: (token: string) => void }) {
  return async function send(messages: PushMessage[]) {
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      try {
        const response = await deps.fetch(deps.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(batch.map((message) => ({ ...message, sound: 'default' }))),
          signal: AbortSignal.timeout(10_000),
        });
        const json = (await response.json()) as { data?: { status: string; details?: { error?: string } }[] };
        json.data?.forEach((ticket, index) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') deps.onDeadToken(batch[index].to);
        });
        log('push_sent', { count: batch.length });
      } catch (error) {
        log('push_failed', { count: batch.length, message: error instanceof Error ? error.message : String(error) });
      }
    }
  };
}

export type PushSender = ReturnType<typeof createPushSender>;
