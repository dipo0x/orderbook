# @orderbook/api

The optional backend for the orderbook wallet. It holds **no keys and signs nothing**: the phone still builds,
signs and approves every transaction. The server does the jobs a phone is bad at.

| Job | Why it lives on a server |
|---|---|
| **RPC proxy** with an allowlist and rate limits | A provider API key can't be hidden inside a mobile app. The proxy also stops phones talking to a node directly. |
| **Push notifications** (incoming, confirmed, large transfer, price move, new phone) | Something has to watch the chain while the app is closed. |
| **Cached prices and currency rates** | One upstream request serves every phone. |
| **Recipient risk checks** | Flagged addresses and "this address has never been used" hints. |

Zero runtime dependencies: Node's built-in `http`, `node:sqlite` and `node:test`. TypeScript runs directly
(Node 24 strips the types), so there is no build step.

## Run it

```bash
cp .env.example .env     # optional
npm run dev              # from this folder, or `npm run api` from the repo root
npm test                 # 42 tests
```

## Endpoints

| Method and path | Purpose | Limit (per IP) |
|---|---|---|
| `GET /health` | Liveness | none |
| `POST /rpc/:cluster` | One JSON-RPC call to `mainnet-beta`, `devnet` or `testnet`. Only these methods: `getBalance`, `getLatestBlockhash`, `getFeeForMessage`, `simulateTransaction`, `sendTransaction`, `getSignatureStatuses`, `getTransaction`, `getSignaturesForAddress`, `getTokenAccountsByOwner`, plus `requestAirdrop` on test networks. No batches, 64 KB body cap. | burst 60, 120/min |
| `GET /prices?ids=BTC-USDT,SOL-USDT` | OKX spot tickers, cached 5 s, served stale for up to 5 min if OKX is down | burst 60, 120/min |
| `GET /fx` | USD to NGN/EUR/GBP, cached 1 h | burst 60, 120/min |
| `POST /risk/check` | `{ cluster, owner, recipient }` → `{ level: ok / warn / block, reasons[] }` | burst 60, 120/min |
| `POST /devices` | Register a phone for alerts: `{ token, address, cluster, prefs }` | burst 10, 12/min |
| `DELETE /devices` | `{ token }` stop alerts | burst 10, 12/min |

The request and response types are shared with the app in [`packages/shared`](../../packages/shared/src/index.ts).

## How notifications work

A watcher polls each registered wallet's history every `WATCH_INTERVAL_MS`. The first time it sees a wallet it only
records where the history ends, so old activity never notifies. After that, each new transaction is parsed
(balance change, fee, counterparty) and turned into messages according to each phone's preferences, then sent
through Expo's push service. Phones that have uninstalled the app are removed when Apple reports them.
A transaction the node can't read yet is retried on the next pass instead of skipped.

Polling keeps the project dependency-free and easy to run. At real scale you would replace it with a provider's
webhooks or a Geyser stream.

## Operating notes

- Logs are one JSON line per event and never contain request bodies, keys or full addresses.
- The database is a single SQLite file (`DB_PATH`). It stores push tokens next to public addresses, nothing else.
- Registering is not authenticated: anyone could register someone else's public address to receive alerts on their
  own phone. That reveals nothing the blockchain doesn't already show. Add a signed-message check if that matters to you.
- `data/flagged-addresses.json` is an empty list. Add `{ "address": "...", "reason": "..." }` entries to block recipients.
