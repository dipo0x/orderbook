import type { SolanaCluster } from '@orderbook/shared';

import { log, mask } from './log.ts';
import type { PriceService } from './prices.ts';
import type { PushMessage, PushSender } from './push.ts';
import type { RpcClient } from './rpc-proxy.ts';
import type { Device, Store } from './store.ts';

const LAMPORTS_PER_SOL = 1_000_000_000n;
const MAX_NEW_PER_TICK = 20;
const HOUR_MS = 60 * 60_000;
const ALERT_COOLDOWN_MS = 6 * HOUR_MS;

/** What one transaction did to one wallet. */
export type TxEffect = {
  signature: string;
  failed: boolean;
  /** Lamports that left (negative) or arrived (positive), with the network fee already taken out of "sent". */
  netLamports: bigint;
  counterparty: string | null;
};

type RawTransaction = {
  meta: { err: unknown; fee: number; preBalances: number[]; postBalances: number[] } | null;
  transaction: { message: { accountKeys: (string | { pubkey: string })[] } };
};

/** Works out, from a parsed transaction, how it changed `address`'s SOL balance and who was on the other side. */
export function analyzeTransaction(address: string, signature: string, tx: RawTransaction): TxEffect | null {
  if (!tx.meta) return null;
  const keys = tx.transaction.message.accountKeys.map((key) => (typeof key === 'string' ? key : key.pubkey));
  const index = keys.indexOf(address);
  if (index < 0) return null;

  const delta = (i: number) => BigInt(tx.meta!.postBalances[i]) - BigInt(tx.meta!.preBalances[i]);
  const fee = BigInt(tx.meta.fee);
  const paidFee = index === 0;
  // For the fee payer the fee is part of the balance drop, but it is not "the amount sent".
  const net = paidFee ? delta(index) + fee : delta(index);
  const counterIndex = keys.findIndex((_, i) => i !== index && (net > 0n ? delta(i) < 0n : delta(i) > 0n));

  return {
    signature,
    failed: tx.meta.err !== null,
    netLamports: net,
    counterparty: net !== 0n && counterIndex >= 0 ? keys[counterIndex] : null,
  };
}

export function formatSol(lamports: bigint): string {
  const abs = lamports < 0n ? -lamports : lamports;
  const whole = abs / LAMPORTS_PER_SOL;
  const fraction = (abs % LAMPORTS_PER_SOL).toString().padStart(9, '0').slice(0, 4).replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}`;
}

/** The notifications this transaction should cause, given each device's preferences. */
export function notificationsFor(
  effect: TxEffect,
  address: string,
  devices: Device[],
  largeTransferSol: number,
): PushMessage[] {
  const messages: PushMessage[] = [];
  const data = { signature: effect.signature, address };
  const other = effect.counterparty ? mask(effect.counterparty) : 'an unknown address';
  const large = effect.netLamports < 0n && -effect.netLamports >= BigInt(Math.round(largeTransferSol * 1e9));

  for (const device of devices) {
    if (effect.failed) {
      if (device.prefs.confirmed) {
        messages.push({ to: device.token, title: 'Transaction failed', body: 'The network rejected it. Only the fee may have been charged.', data });
      }
      continue;
    }
    if (effect.netLamports > 0n && device.prefs.incoming) {
      messages.push({ to: device.token, title: `Received ${formatSol(effect.netLamports)} SOL`, body: `From ${other}`, data });
    } else if (effect.netLamports < 0n) {
      if (device.prefs.confirmed) {
        messages.push({ to: device.token, title: `Sent ${formatSol(effect.netLamports)} SOL`, body: `Confirmed. To ${other}`, data });
      }
      if (large && device.prefs.largeTransfer) {
        messages.push({ to: device.token, title: 'Large transfer', body: `${formatSol(effect.netLamports)} SOL left your wallet. Not you? Open the app now.`, data });
      }
    }
  }
  return messages;
}

type PriceRef = { price: number; at: number };

export function createWatcher(deps: {
  store: Store;
  rpc: RpcClient;
  push: PushSender;
  prices: PriceService;
  largeTransferSol: number;
  priceAlertPercent: number;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  let priceRef: PriceRef | null = null;
  let lastPriceAlertAt = -Infinity;

  async function checkWallet(cluster: SolanaCluster, address: string) {
    const cursor = deps.store.getCursor(cluster, address);

    // First time we see this wallet: remember where its history ends, and notify only about what comes next.
    if (cursor === null) {
      const [latest] = await deps.rpc<{ signature: string }[]>(cluster, 'getSignaturesForAddress', [address, { limit: 1, commitment: 'confirmed' }]);
      deps.store.setCursor(cluster, address, latest?.signature ?? '');
      return;
    }

    const found = await deps.rpc<{ signature: string; err: unknown }[]>(cluster, 'getSignaturesForAddress', [
      address,
      { limit: MAX_NEW_PER_TICK, commitment: 'confirmed', ...(cursor ? { until: cursor } : {}) },
    ]);
    const devices = deps.store.devicesForWallet(cluster, address);

    // Oldest first, so notifications arrive in the order things happened and the cursor only moves forward.
    for (const { signature } of [...found].reverse()) {
      const tx = await deps.rpc<RawTransaction | null>(cluster, 'getTransaction', [
        signature,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
      ]);
      if (!tx) return; // not readable yet: try again next tick from the same place
      const effect = analyzeTransaction(address, signature, tx);
      if (effect) await deps.push(notificationsFor(effect, address, devices, deps.largeTransferSol));
      deps.store.setCursor(cluster, address, signature);
    }
  }

  return {
    /** One pass over every watched wallet. A problem with one wallet never stops the others. */
    async tick() {
      for (const { cluster, address } of deps.store.watchedWallets()) {
        try {
          await checkWallet(cluster, address);
        } catch (error) {
          log('watch_failed', { wallet: mask(address), message: error instanceof Error ? error.message : String(error) });
        }
      }
      deps.store.pruneCursors();
    },

    /** Alerts every opted-in phone when SOL moves sharply within an hour. */
    async priceTick() {
      let price: number;
      try {
        const { data } = await deps.prices.tickers(['SOL-USDT']);
        price = Number(data[0]?.last);
        if (!Number.isFinite(price) || price <= 0) return;
      } catch {
        return;
      }
      const time = now();
      if (!priceRef) {
        priceRef = { price, at: time };
        return;
      }
      const percent = ((price - priceRef.price) / priceRef.price) * 100;
      if (Math.abs(percent) >= deps.priceAlertPercent && time - lastPriceAlertAt >= ALERT_COOLDOWN_MS) {
        lastPriceAlertAt = time;
        const tokens = new Set(deps.store.allDevices().filter((d) => d.prefs.priceAlerts).map((d) => d.token));
        await deps.push(
          [...tokens].map((to) => ({
            to,
            title: `SOL ${percent > 0 ? 'up' : 'down'} ${Math.abs(percent).toFixed(1)}%`,
            body: `Now $${price.toFixed(2)}, ${percent > 0 ? 'up' : 'down'} from $${priceRef!.price.toFixed(2)} within the hour.`,
          })),
        );
        priceRef = { price, at: time };
      } else if (time - priceRef.at >= HOUR_MS) {
        priceRef = { price, at: time };
      }
    },
  };
}

export type Watcher = ReturnType<typeof createWatcher>;
