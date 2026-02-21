# ✈️ booba-pass

A premium, mobile-first flight history tracker built as a **Progressive Web App (PWA)**.

## 🚀 Features

- **Dashboard**: Track your total flights, distance (km), and time in the air.
- **Flight History**: Beautifully organized list of past and upcoming flights, grouped by year.
- **Detailed View**: Full information for every flight, including airline, aircraft, seat, and notes.
- **Global Map**: Visualize all your flight routes on an interactive world map.
- **Analytics**: Monthly activity charts, top routes, and airline distribution.
- **PWA**: Install it on your phone for a native-like experience.
- **Local First**: All data is stored securely in your browser's IndexedDB. No accounts, no tracking.

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Storage**: Dexie.js (IndexedDB)
- **Maps**: Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React
- **Airport Data**: Static data from OurAirports

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate the airport database:

   ```bash
   node scripts/build-airports.mjs
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

### Building for Production

To test the PWA features (offline, splash screens, etc.), run:

```bash
npm run build
npm run preview
```

## 📱 Mobile Installation

- **iOS Safari**: Tap the "Share" icon -> "Add to Home Screen".
- **Android Chrome**: Tap the three-dot menu -> "Install App".

---

_Created with ❤️ for travelers._
