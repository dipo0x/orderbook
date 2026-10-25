import type { DeviceRegistration, NotificationPrefs, RiskCheckRequest, SolanaCluster } from '@orderbook/shared';

import { isSolanaAddress } from './base58.ts';
import type { Config } from './config.ts';
import { HttpError, type Route, createHandler } from './http.ts';
import { mask, log } from './log.ts';
import type { PriceService } from './prices.ts';
import type { PushSender } from './push.ts';
import { RateLimiter } from './rate-limit.ts';
import { type FlaggedList, assessRecipient } from './risk.ts';
import { type RpcClient, type Upstream, forwardRpc, isCluster, validateRpcRequest } from './rpc-proxy.ts';
import type { Store } from './store.ts';

const PREF_KEYS: (keyof NotificationPrefs)[] = ['confirmed', 'incoming', 'priceAlerts', 'newSignIn', 'largeTransfer'];
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/;

function parsePrefs(value: unknown): NotificationPrefs {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, 'bad_request', 'prefs is required.');
  const prefs = {} as NotificationPrefs;
  for (const key of PREF_KEYS) {
    const flag = (value as Record<string, unknown>)[key];
    if (typeof flag !== 'boolean') throw new HttpError(400, 'bad_request', `prefs.${key} must be true or false.`);
    prefs[key] = flag;
  }
  return prefs;
}

function parseCluster(value: unknown): SolanaCluster {
  if (typeof value !== 'string' || !isCluster(value)) throw new HttpError(400, 'bad_request', 'Unknown cluster.');
  return value;
}

export type AppDeps = {
  config: Config;
  upstream: Upstream;
  rpc: RpcClient;
  store: Store;
  push: PushSender;
  prices: PriceService;
  flagged: FlaggedList;
};

/** Every route of the API. Rate limits are per client IP and per route group. */
export function buildRoutes(deps: AppDeps): Route[] {
  const rpcLimit = new RateLimiter(60, 2); // bursts of 60, then 120 a minute
  const readLimit = new RateLimiter(60, 2);
  const writeLimit = new RateLimiter(10, 0.2); // 12 a minute

  return [
    { method: 'GET', path: '/health', handler: () => ({ ok: true }) },

    {
      method: 'POST',
      path: '/rpc/:cluster',
      limiter: rpcLimit,
      async handler({ params, body }) {
        const cluster = parseCluster(params.cluster);
        const request = validateRpcRequest(body, cluster);
        return forwardRpc(deps.upstream, cluster, request);
      },
    },

    {
      method: 'GET',
      path: '/prices',
      limiter: readLimit,
      handler: ({ query }) => {
        const ids = query.get('ids')?.split(',').filter(Boolean).slice(0, 100) ?? null;
        return deps.prices.tickers(ids);
      },
    },
    { method: 'GET', path: '/fx', limiter: readLimit, handler: () => deps.prices.rates() },

    {
      method: 'POST',
      path: '/risk/check',
      limiter: readLimit,
      async handler({ body }) {
        const input = (body ?? {}) as Partial<RiskCheckRequest>;
        const request: RiskCheckRequest = {
          cluster: parseCluster(input.cluster),
          owner: String(input.owner ?? ''),
          recipient: String(input.recipient ?? ''),
        };
        return assessRecipient(request, { rpc: deps.rpc, flagged: deps.flagged });
      },
    },

    {
      method: 'POST',
      path: '/devices',
      limiter: writeLimit,
      async handler({ body }) {
        const input = (body ?? {}) as Partial<DeviceRegistration>;
        if (typeof input.token !== 'string' || !EXPO_TOKEN.test(input.token)) throw new HttpError(400, 'bad_request', 'token is not an Expo push token.');
        if (!isSolanaAddress(input.address)) throw new HttpError(400, 'bad_request', 'address is not a Solana address.');
        const registration: DeviceRegistration = {
          token: input.token,
          address: input.address,
          cluster: parseCluster(input.cluster),
          prefs: parsePrefs(input.prefs),
        };

        // A phone we haven't seen before appearing on a wallet that already has phones: tell the others.
        const isNewPhone = deps.store.getDevice(registration.token) === null;
        const others = deps.store
          .devicesForWallet(registration.cluster, registration.address)
          .filter((device) => device.token !== registration.token && device.prefs.newSignIn);
        deps.store.upsertDevice(registration);
        if (isNewPhone && others.length > 0) {
          await deps.push(
            others.map((device) => ({
              to: device.token,
              title: 'New phone added',
              body: `A new phone is now getting alerts for ${mask(registration.address)}. Not you? Check your wallet.`,
            })),
          );
        }
        log('device_registered', { wallet: mask(registration.address), cluster: registration.cluster });
        return { ok: true };
      },
    },

    {
      method: 'DELETE',
      path: '/devices',
      limiter: writeLimit,
      handler({ body }) {
        const token = (body as { token?: unknown } | undefined)?.token;
        if (typeof token !== 'string') throw new HttpError(400, 'bad_request', 'token is required.');
        deps.store.deleteDevice(token);
        return { ok: true };
      },
    },
  ];
}

export const createApp = (deps: AppDeps) => createHandler(buildRoutes(deps), { trustProxy: deps.config.trustProxy });
