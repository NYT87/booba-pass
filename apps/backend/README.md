# Booba Pass Tracking Proxy Backend

This is a **Cloudflare Worker** designed specifically to act as a backend proxy for the Booba Pass frontend application. It handles fetching tracking data from external sources and parsing it appropriately.

## Why a Proxy?

Many flight tracking websites enforce strict CORS policies or implement anti-bot measures that make client-side extraction directly from a browser very difficult. By routing these extraction requests through a Cloudflare Worker:

1. We bypass browser CORS restrictions.
2. We perform DOM parsing and Regex matching on the edge network reliably.
3. We optimize bandwidth by only returning the strictly parsed JSON metadata back to the web application.

## Development Setup

If you are running the project from the monorepo root:

```bash
# Start the local Wrangler dev server on port 8787
npm run dev -w apps/backend

# Test the extraction logic using Vitest
npm run test -w apps/backend
```

If you are executing commands directly from the `apps/backend` directory:

```bash
npm install
npm run dev
npm run test
```

## API Endpoint Usage

The Worker proxy receives a `POST` request with the following JSON body schema:

```json
{
  "url": "https://www.flightradar24.com/data/flights/fr24"
}
```

It returns strictly formatted information for flights corresponding to the `ExtractedTrackingFlightData` type.

## Testing Locally via cURL

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.flightradar24.com/data/flights/aa1"}'
```

## Deployment

Deploying the code manually straight to Cloudflare requires Wrangler to be authenticated on your machine:

```bash
npm run deploy
```

Make sure to adjust your endpoint locally or within `.env` on production to point towards the Cloudflare deployment hostname.
