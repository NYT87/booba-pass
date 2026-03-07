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

  it('does not return airline image for FlightStats pages', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://assets.flightstats.com/common/fs-meta-social.jpg" />
        </head>
        <body>
          <div>Flight OZ742</div>
        </body>
      </html>
    `

    const extracted = extractTrackingFlightDataFromHtml(html, {
      baseUrl: 'https://www.flightstats.com/v2/flight-details/OZ/742?year=2026&month=3&date=8',
    })

    expect(extracted).toBeTruthy()
    expect(extracted?.airlineImage).toBeUndefined()
  })

  it('maps Estimated times to actual when Actual is missing', () => {
    const html = `
      <html>
        <body>
          <div>Flight OZ748</div>
          <div>Scheduled Departure 2026-03-07T15:55:00Z</div>
          <div>Estimated Departure 2026-03-07T16:10:00Z</div>
          <div>Scheduled Arrival 2026-03-07T18:30:00Z</div>
          <div>Estimated Arrival 2026-03-07T18:45:00Z</div>
        </body>
      </html>
    `

    const extracted = extractTrackingFlightDataFromHtml(html, {
      baseUrl: 'https://www.flightstats.com/v2/flight-details/OZ/748?year=2026&month=3&date=7',
    })

    expect(extracted).toBeTruthy()
    expect(extracted?.scheduledDepartureTime).toBe('15:55')
    expect(extracted?.actualDepartureTime).toBe('16:10')
    expect(extracted?.scheduledArrivalTime).toBe('18:30')
    expect(extracted?.actualArrivalTime).toBe('18:45')
  })

  it('extracts airline name from FlightStats title/header pattern', () => {
    const html = `
      <html>
        <head>
          <title>(OZ) Asiana Airlines 748 Flight Details</title>
        </head>
        <body>
          <h1>(OZ) Asiana Airlines 748 Flight Details</h1>
          <div>Departure HKT</div>
          <div>Arrival ICN</div>
        </body>
      </html>
    `

    const extracted = extractTrackingFlightDataFromHtml(html, {
      baseUrl: 'https://www.flightstats.com/v2/flight-details/OZ/748?year=2026&month=3&date=7',
    })

    expect(extracted).toBeTruthy()
    expect(extracted?.airline).toBe('Asiana Airlines')
  })

  it('removes aircraft manufacturer from extracted aircraft', () => {
    const html = `
      <html>
        <body>
          <div>Aircraft AIRBUS A330-300</div>
          <div>Flight OZ748</div>
        </body>
      </html>
    `

    const extracted = extractTrackingFlightDataFromHtml(html, {
      baseUrl: 'https://www.flightstats.com/v2/flight-details/OZ/748?year=2026&month=3&date=7',
    })

    expect(extracted).toBeTruthy()
    expect(extracted?.aircraft).toBe('A330-300')
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

  it('parses FlightStats tracker URL fallback', () => {
    const extracted = extractFromTrackingUrl(
      'https://www.flightstats.com/v2/flight-tracker/OZ/742?year=2026&month=03&date=07&flightId=1370660447'
    )

    expect(extracted).toBeTruthy()
    expect(extracted?.flightNumber).toBe('OZ742')
    expect(extracted?.scheduledDepartureDate).toBe('2026-03-07')
    expect(extracted?.departureIata).toBeUndefined()
    expect(extracted?.arrivalIata).toBeUndefined()
  })

  it('parses Flightera tracker URL fallback', () => {
    const extracted = extractFromTrackingUrl(
      'https://www.flightera.net/en/flight_details/Asiana+Airlines-Bangkok-Seoul/OZ742/VTBS/2026-03-06'
    )

    expect(extracted).toBeTruthy()
    expect(extracted?.flightNumber).toBe('OZ742')
    expect(extracted?.departureIata).toBe('VTBS')
    expect(extracted?.scheduledDepartureDate).toBe('2026-03-06')
    expect(extracted?.arrivalIata).toBeUndefined()
  })
})
