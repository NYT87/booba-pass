# booba-pass

A mobile-first flight and loyalty tracker built as a Progressive Web App (PWA).

Version: `0.1.0`

## What it does

- Track flights with route, schedule, aircraft, seat, notes, photos, and boarding pass.
- Organize flights by `all`, `past`, and `upcoming`.
- View an interactive map of your routes.
- Track loyalty memberships with QR/barcode support.
- Show loyalty alliance/group tags (for example: Star Alliance, SkyTeam, Oneworld).
- Copy membership numbers and quickly open/edit card codes.
- View personal travel stats (flights, distance, hours, aircraft, airlines).
- Import/export backups from the Settings page.
- Run fully local-first using IndexedDB (no account required).

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

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: generate airport data + typecheck + production build
- `npm run preview`: preview production build
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
