# booba-pass

A mobile-first flight and loyalty tracker built as a Progressive Web App (PWA).

Version: `0.1.2`

## What it does

- Track flights with route, schedule, aircraft, seat, notes, photos, and boarding pass.
- Start a new flight in 3 modes: by flight code, by tracking link, or fully manual input.
- Auto-fill flight fields from provider-backed tracking extraction (with graceful fallback to manual flow).
- Link each flight to a loyalty membership and record granted mileage.
- Organize flights by `all`, `past`, and `upcoming`.
- View an interactive map of your routes.
- Track loyalty memberships with separate QR and barcode values.
- Auto-detect QR/barcode data from uploaded membership card images.
- Show loyalty alliance/group tags (for example: Star Alliance, SkyTeam, Oneworld).
- View full-screen membership code previews with member name and number.
- Open membership mileage history with recent linked flights and earned mileage.
- View personal travel stats (flights, distance, hours, aircraft, airlines).
- Import/export backups from the Settings page.
- Run fully local-first using IndexedDB (no account required).
- Use static airline/loyalty catalogs under `public/data/*.json` for suggestions and lookup.

## PWA behavior

- Installable on mobile and desktop.
- Startup splash screen for native app feel.
- In-app update prompt when a new version is available (`Update now` / `Later`).
- Offline-capable service worker with cached app shell/assets.

## Tech stack

- React 19 + TypeScript
- Vite 7
- `vite-plugin-pwa` + Workbox
- Dexie (IndexedDB)
- React Router
- Leaflet + React Leaflet
- Recharts
- web-haptics

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) `20.19+` or `22.12+`
- npm

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Build

```bash
npm run build
```

Then preview:

```bash
npm run preview
```

Note: `npm run build` runs `scripts/build-airports.mjs` first, which fetches airport source data from GitHub.
Airport data is generated to `public/data/airports.json`.

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: generate airport data + typecheck + production build
- `npm run preview`: preview production build
- `npm run test:tracking`: run tracking extraction tests
- `npm run inspect:tracking`: inspect extraction output for a provider URL
- `npm run lint`: run ESLint
- `npm run lint:fix`: auto-fix lint issues
- `npm run format`: run Prettier write
- `npm run format:check`: check formatting

## Usage docs

- End-user guide: [`docs/USAGE.md`](./docs/USAGE.md)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## Mobile install

- iOS Safari: Share -> Add to Home Screen
- Android Chrome: Menu -> Install app
