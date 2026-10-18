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
- [ ] Tab shell with Liquid Glass tab bar (the tabs are still the Expo template)
- [ ] Markets list and market detail (live order book, trades)
- [ ] Watchlist and search
- [x] Wallet setup: create, import, Face ID lock, recovery phrase backup and confirmation (Solana)
- [ ] Wallet: send, receive, portfolio (Solana devnet first)
- [ ] Activity, profile and settings

## Wallet security model

- Keys are generated and stored on the device only. The 12-word recovery phrase is encrypted in the iOS keychain (`expo-secure-store`), protected by Face ID when enabled, and never leaves the phone.
- Key derivation lives in `apps/mobile/src/core/wallet/` (pure TypeScript, no UI): BIP-39 phrases and SLIP-0010 ed25519 at `m/44'/501'/0'/0'`. It is checked against the standard "abandon … about" test vector.
- During setup the phrase is held in memory only and is never put in route params, logs or storage until the wallet is saved.
- Face ID and the keychain need a development build, not Expo Go. After adding native modules, rebuild with `npx expo run:ios --device <udid>`.

## Notes

- The tab bar uses Expo Router's native tabs (`expo-router/native-tabs`, stable since SDK 58).
- Styling uses Tailwind v4 through [Uniwind](https://docs.uniwind.dev) (`className`). Figma design tokens (colors, fonts) live in `apps/mobile/src/global.css` under `@theme`. `src/uniwind-types.d.ts` is generated when Metro starts.
- Fonts are Inter and JetBrains Mono, loaded with `@expo-google-fonts`. Use the `font-inter-*` and `font-jetbrains-*` classes, because React Native needs one font family per weight.
- After changing `global.css` or `metro.config.js`, restart the dev server with `npx expo start --clear`.
- Do not commit secrets. `.env` files are git-ignored; put RPC and API keys there.
