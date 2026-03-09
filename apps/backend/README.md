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
  "url": "https://www.flightstats.com/v2/flight-details/OZ/748?year=2026&month=3&date=7"
}
```

Or by flight code:

```json
{
  "flightCode": "OZ748",
  "date": "2026-03-07"
}
```

`date` is optional and must be ISO `YYYY-MM-DD` when provided. If omitted, the backend uses the current ISO date (`new Date().toISOString().slice(0, 10)`).

It returns structured flight details matching the `ExtractedTrackingFlightData` shape in a JSON envelope:

- success: `{ "data": { ... } }`
- error: `{ "error": "..." }`

Provider strategy currently prioritizes FlightStats flight-details URLs and also attempts Flightera and FlightAware variants when searching by flight code.

## Testing Locally via cURL

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.flightstats.com/v2/flight-details/OZ/748?year=2026&month=3&date=7"}'
```

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"flightCode":"OZ748","date":"2026-03-07"}'
```

## Deployment

Deploying the code manually straight to Cloudflare requires Wrangler to be authenticated on your machine:

```bash
npm run deploy
```

Make sure to adjust your endpoint locally or within `.env` on production to point towards the Cloudflare deployment hostname.

## CI Deployment

Backend deployment is automated in `.github/workflows/release-please.yml` and runs only when a backend release is created.

Required GitHub repository secrets:

1. `CLOUDFLARE_API_TOKEN` (Cloudflare token with Workers Scripts edit permissions)
2. `CLOUDFLARE_ACCOUNT_ID`
