import { describe, it, expect } from 'vitest'
import { extractFromTrackingUrl, extractTrackingFlightDataFromHtml } from '../src/index'

describe('extractTrackingFlightDataFromHtml', () => {
  it('parses flight fields from JSON-LD and meta', () => {
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

    expect(extracted).toBeTruthy()
    expect(extracted?.airline).toBe('NOK AIR')
    expect(extracted?.flightNumber).toBe('NOK531')
    expect(extracted?.departureIata).toBe('VTSP')
    expect(extracted?.arrivalIata).toBe('VTBD')
    expect(extracted?.scheduledDepartureDate).toBe('2026-02-12')
    expect(extracted?.scheduledArrivalDate).toBe('2026-02-12')
    expect(extracted?.airlineImage).toBe('https://images.example.com/airline/logo.png')
  })

  it('parses delayed actual departure/arrival fields', () => {
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

    expect(extracted).toBeTruthy()
    expect(extracted?.flightNumber).toBe('AAR747')
    expect(extracted?.departureIata).toBe('RKSI')
    expect(extracted?.arrivalIata).toBe('VTSP')
    expect(extracted?.scheduledDepartureDate).toBe('2026-02-06')
    expect(extracted?.scheduledDepartureTime).toBe('08:10')
    expect(extracted?.actualDepartureDate).toBe('2026-02-06')
    expect(extracted?.actualDepartureTime).toBe('08:44')
    expect(extracted?.actualArrivalDate).toBe('2026-02-06')
    expect(extracted?.actualArrivalTime).toBe('15:12')
  })
})

describe('extractFromTrackingUrl', () => {
  it('parses FlightAware path fallback for AAR747', () => {
    const extracted = extractFromTrackingUrl(
      'https://www.flightaware.com/live/flight/AAR747/history/20260206/0810Z/RKSI/VTSP'
    )

    expect(extracted).toBeTruthy()
    expect(extracted?.flightNumber).toBe('AAR747')
    expect(extracted?.departureIata).toBe('RKSI')
    expect(extracted?.arrivalIata).toBe('VTSP')
    expect(extracted?.scheduledDepartureDate).toBe('2026-02-06')
    expect(extracted?.scheduledDepartureTime).toBe('08:10')
    expect(extracted?.timesInUtc).toBe(true)
  })
})
