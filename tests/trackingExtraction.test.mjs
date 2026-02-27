import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractFromTrackingUrl,
  extractTrackingFlightDataFromHtml,
} from '../src/utils/trackingExtraction.ts'

test('extractTrackingFlightDataFromHtml parses flight fields from JSON-LD and meta', () => {
  const html = `
    <html>
      <head>
        <meta property="og:image" content="https://images.example.com/airline/logo.png" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Flight",
            "flightNumber": "NOK531",
            "departureTime": "2026-02-12T11:30:00Z",
            "arrivalTime": "2026-02-12T13:05:00Z",
            "departureAirport": { "@type": "Airport", "iataCode": "VTSP" },
            "arrivalAirport": { "@type": "Airport", "iataCode": "VTBD" },
            "airline": { "@type": "Airline", "name": "NOK AIR" }
          }
        </script>
      </head>
      <body></body>
    </html>
  `

  const extracted = extractTrackingFlightDataFromHtml(html, {
    baseUrl: 'https://www.flightaware.com/live/flight/NOK531/history/20260212/1130Z/VTSP/VTBD',
  })

  assert.ok(extracted)
  assert.equal(extracted.airline, 'NOK AIR')
  assert.equal(extracted.flightNumber, 'NOK531')
  assert.equal(extracted.departureIata, 'VTSP')
  assert.equal(extracted.arrivalIata, 'VTBD')
  assert.equal(extracted.scheduledDepartureDate, '2026-02-12')
  assert.equal(extracted.scheduledArrivalDate, '2026-02-12')
  assert.equal(extracted.airlineImage, 'https://images.example.com/airline/logo.png')
})

test('extractTrackingFlightDataFromHtml parses delayed actual departure/arrival fields', () => {
  const html = `
    <html>
      <body>
        <div>Flight AAR747 RKSI / VTSP</div>
        <div>Scheduled Departure 2026-02-06T08:10:00Z</div>
        <div>Actual Departure 2026-02-06T08:44:00Z</div>
        <div>Scheduled Arrival 2026-02-06T14:25:00Z</div>
        <div>Actual Arrival 2026-02-06T15:12:00Z</div>
      </body>
    </html>
  `

  const extracted = extractTrackingFlightDataFromHtml(html, {
    baseUrl: 'https://www.flightaware.com/live/flight/AAR747/history/20260206/0810Z/RKSI/VTSP',
  })

  assert.ok(extracted)
  assert.equal(extracted.flightNumber, 'AAR747')
  assert.equal(extracted.departureIata, 'RKSI')
  assert.equal(extracted.arrivalIata, 'VTSP')
  assert.equal(extracted.scheduledDepartureDate, '2026-02-06')
  assert.equal(extracted.scheduledDepartureTime, '08:10')
  assert.equal(extracted.actualDepartureDate, '2026-02-06')
  assert.equal(extracted.actualDepartureTime, '08:44')
  assert.equal(extracted.actualArrivalDate, '2026-02-06')
  assert.equal(extracted.actualArrivalTime, '15:12')
})

test('extractFromTrackingUrl parses FlightAware path fallback for AAR747', () => {
  const extracted = extractFromTrackingUrl(
    'https://www.flightaware.com/live/flight/AAR747/history/20260206/0810Z/RKSI/VTSP'
  )

  assert.ok(extracted)
  assert.equal(extracted.flightNumber, 'AAR747')
  assert.equal(extracted.departureIata, 'RKSI')
  assert.equal(extracted.arrivalIata, 'VTSP')
  assert.equal(extracted.scheduledDepartureDate, '2026-02-06')
  assert.equal(extracted.scheduledDepartureTime, '08:10')
  assert.equal(extracted.timesInUtc, true)
})
