import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { log } from './log.ts';
import { createPriceService } from './prices.ts';
import { createPushSender } from './push.ts';
import { parseFlaggedList } from './risk.ts';
import { createRpcClient, type Upstream } from './rpc-proxy.ts';
import { Store } from './store.ts';
import { createWatcher } from './watcher.ts';

const config = loadConfig();
const store = new Store(config.dbPath);

const upstream: Upstream = { urls: config.upstream, fetch, timeoutMs: 15_000 };
const rpc = createRpcClient(upstream);
const prices = createPriceService({ fetch });
const push = createPushSender({
  fetch,
  url: config.expoPushUrl,
  onDeadToken: (token) => {
    log('device_removed', { reason: 'DeviceNotRegistered' });
    store.deleteDevice(token);
  },
});

let flagged = new Map<string, string>();
try {
  flagged = parseFlaggedList(readFileSync(config.flaggedFile, 'utf8'));
} catch {
  log('flagged_list_missing', { file: config.flaggedFile });
}

const watcher = createWatcher({
  store,
  rpc,
  push,
  prices,
  largeTransferSol: config.largeTransferSol,
  priceAlertPercent: config.priceAlertPercent,
});

// One pass at a time: if the node is slow, passes queue up behind each other instead of piling on.
let running = false;
const loop = setInterval(async () => {
  if (running) return;
  running = true;
  try {
    await watcher.tick();
    await watcher.priceTick();
  } finally {
    running = false;
  }
}, config.watchIntervalMs);

const server = createServer(createApp({ config, upstream, rpc, store, push, prices, flagged }));
server.listen(config.port, () => log('listening', { port: config.port, flagged: flagged.size, devices: store.allDevices().length }));

function shutdown() {
  clearInterval(loop);
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
