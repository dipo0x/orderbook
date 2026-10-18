# orderbook

A mobile app for watching live crypto order books, built with Expo and React Native. Market data comes from OKX's public WebSocket feed. A non-custodial Solana wallet is planned as a later phase.

Design: Figma file "Order Book Viewer — Project 1" (dark theme only, iOS 26 Liquid Glass tab bar).

## Repository layout

npm workspaces monorepo.

```
apps/
  mobile/        Expo app (Expo Router, React Native)
  api/           Backend (stub for now)
packages/
  shared/        Types shared by the app and the API (@orderbook/shared)
```

Inside `apps/mobile/src/`:

| Folder | Contents |
|---|---|
| `app/` | Routes only (Expo Router). `(tabs)/` holds the main tab screens |
| `features/` | Feature code grouped by screen flow (`onboarding/`, more to come) |
| `components/` | Reusable UI (`ui/` holds the design-system pieces) |
| `constants/` | Template theme constants |
| `lib/` | Small helpers such as onboarding persistence |

## Getting started

Requires Node and npm. Install once from the repo root:

```bash
npm install
```

Then, from the root:

```bash
npm run mobile      # start the Expo dev server
npm run api         # start the API stub on :3000
npm run typecheck   # typecheck every workspace
npm run lint        # lint every workspace
```

Add dependencies to the app with `npx expo install <package>` from `apps/mobile/` so versions match the Expo SDK.

## Status

- [x] Monorepo setup
- [x] Onboarding: splash and three intro screens, shown on first launch only
- [x] Markets list (with search) and market detail: live order book, trades, candles, grouping sheet, connection states
- [x] Liquid Glass tab bar (native tabs); Watchlist, Wallet, Activity and Profile tabs are placeholders
- [ ] Watchlist and search
- [x] Wallet setup: create, import, Face ID lock, recovery phrase backup and confirmation (Solana)
- [x] PIN fallback and unlock screens (Face ID or PIN on app open)
- [ ] Wallet: send, receive, portfolio (Solana devnet first)
- [ ] Activity, profile and settings

## Wallet security model

- Keys are generated and stored on the device only. The 12-word recovery phrase never leaves the phone. It is stored once per unlock method in the iOS keychain (`expo-secure-store`): one copy behind Face ID (optional), and one encrypted with AES-256-GCM under a key derived from a 6-digit PIN (always created). Either method alone opens the wallet.
- PIN attempts are counted before each check. After 5 misses the PIN locks for 1 minute, doubling each round up to 1 hour. Nothing is ever deleted. A 6-digit PIN cannot resist offline guessing by itself; the protection is the device keychain plus these limits.
- The app opens locked when a wallet exists: Face ID if enabled, otherwise the PIN.
- Key derivation lives in `apps/mobile/src/core/wallet/` (pure TypeScript, no UI): BIP-39 phrases and SLIP-0010 ed25519 at `m/44'/501'/0'/0'`. It is checked against the standard "abandon … about" test vector.
- During setup the phrase is held in memory only and is never put in route params, logs or storage until the wallet is saved.
- Face ID and the keychain need a development build, not Expo Go. After adding native modules, rebuild with `npx expo run:ios --device <udid>`.

## Market data

- Source: OKX public API, no key needed. REST for tickers, candles and instrument tick sizes; one shared WebSocket (`src/core/market/okx-socket.ts`) for tickers, `books` (order book) and trades.
- The order book is a local copy (`order-book.ts`): a snapshot plus incremental updates. If an update arrives out of sequence, or the book ever crosses, it is dropped and a fresh snapshot is requested (the "Resyncing" state). OKX's checksum is not used: the public `books` channel sends `checksum: 0`, and the checksummed channels need a login.
- The socket sends a ping when idle, reconnects with backoff (the "Reconnecting" state) and re-subscribes everything.
- Markets shown are set in `src/core/market/markets.ts`.

## Notes

- The tab bar uses Expo Router's native tabs (`expo-router/native-tabs`, stable since SDK 58).
- Styling uses Tailwind v4 through [Uniwind](https://docs.uniwind.dev) (`className`). Figma design tokens (colors, fonts) live in `apps/mobile/src/global.css` under `@theme`. `src/uniwind-types.d.ts` is generated when Metro starts.
- Fonts are Inter and JetBrains Mono, loaded with `@expo-google-fonts`. Use the `font-inter-*` and `font-jetbrains-*` classes, because React Native needs one font family per weight.
- After changing `global.css` or `metro.config.js`, restart the dev server with `npx expo start --clear`.
- Do not commit secrets. `.env` files are git-ignored; put RPC and API keys there.
