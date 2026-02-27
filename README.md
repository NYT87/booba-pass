# booba-pass

A fully local, offline-first progressive web application (PWA) for tracking, analyzing, and storing your flight history and digital boarding passes.

This project is currently structured as a **monorepo** using [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces). 

## Project Structure

- `apps/web`: The core React frontend PWA (built with Vite).
- `apps/backend` (Planned): A lightweight Node proxy for external data retrieval.

## Getting Started

Because this is a monorepo utilizing `npm workspaces`, all commands can be run from this root directory.

### Installation

Install all dependencies for the workspace from the root directory:
```bash
npm install
```

### Development

Start the local development server for the web application:
```bash
npm run dev:web
```

This will run the frontend at `http://localhost:5173`.

### Building

To build the web bundle for production:
```bash
npm run build:web
```
The output will be generated inside `apps/web/dist`.

### Linting and Formatting

To lint across the entire monorepo workspace:
```bash
npm run lint
```

To format code using Prettier:
```bash
npm run format
```

## Deployment

The current GitHub Actions workflow automatically builds and deploys the `apps/web` package to GitHub Pages on every push to the `main` branch.
