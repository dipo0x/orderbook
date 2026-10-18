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
| `constants/` | Theme and design tokens (`design.ts` mirrors the Figma tokens) |
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
- [ ] Wallet: create/import, send, receive (Solana devnet first)
- [ ] Activity, profile and settings

## Notes

- The tab bar uses Expo Router's native tabs (`expo-router/native-tabs`, stable since SDK 58).
- Fonts are Inter and JetBrains Mono, loaded with `@expo-google-fonts`.
- Do not commit secrets. `.env` files are git-ignored; put RPC and API keys there.
