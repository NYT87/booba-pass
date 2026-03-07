import test from 'node:test'
import assert from 'node:assert/strict'

import {
  fetchAndExtractTrackingFlightData,
  fetchAndExtractTrackingFlightDataByCode,
} from '../src/utils/trackingExtraction.ts'

const ORIGINAL_FETCH = globalThis.fetch

function mockFetchWithResponse(response) {
  globalThis.fetch = async () => response
}

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
})

test('returns data from { data } envelope', async () => {
  mockFetchWithResponse(
    new Response(
      JSON.stringify({
        data: {
          flightNumber: 'KE123',
          departureIata: 'ICN',
          arrivalIata: 'NRT',
          sourceUrl: 'https://example.com/source',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  )

  const result = await fetchAndExtractTrackingFlightData('https://example.com/track')

  assert.equal(result?.flightNumber, 'KE123')
  assert.equal(result?.sourceUrl, 'https://example.com/source')
})

test('returns data from { result } envelope and backfills sourceUrl', async () => {
  const trackUrl = 'https://example.com/track'
  mockFetchWithResponse(
    new Response(
      JSON.stringify({
        result: {
          flightNumber: 'AA1',
          departureIata: 'LAX',
          arrivalIata: 'JFK',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  )

  const result = await fetchAndExtractTrackingFlightData(trackUrl)

  assert.equal(result?.flightNumber, 'AA1')
  assert.equal(result?.sourceUrl, trackUrl)
})

test('returns data when proxy returns direct object on HTTP 200', async () => {
  const trackUrl = 'https://example.com/track'
  mockFetchWithResponse(
    new Response(
      JSON.stringify({
        flightNumber: 'DL77',
        departureIata: 'ATL',
        arrivalIata: 'LHR',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  )

  const result = await fetchAndExtractTrackingFlightData(trackUrl)

  assert.equal(result?.flightNumber, 'DL77')
  assert.equal(result?.sourceUrl, trackUrl)
})

test('does not throw on HTTP 200 with non-JSON body', async () => {
  mockFetchWithResponse(new Response('ok', { status: 200 }))

  const result = await fetchAndExtractTrackingFlightData('https://example.com/track')

  assert.equal(result, null)
})

test('throws when proxy fails, even if URL is parseable', async () => {
  const trackUrl = 'https://www.flightstats.com/v2/flight-details/OZ/748?year=2026&month=3&date=7'
  mockFetchWithResponse(
    new Response(JSON.stringify({ error: 'upstream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  await assert.rejects(() => fetchAndExtractTrackingFlightData(trackUrl), /upstream failed/)
})

test('extracts by flight code via proxy response', async () => {
  mockFetchWithResponse(
    new Response(
      JSON.stringify({
        data: {
          flightNumber: 'OZ742',
          departureIata: 'VTBS',
          arrivalIata: 'RKSI',
          scheduledDepartureDate: '2026-03-07',
          sourceUrl: 'https://www.flightstats.com/v2/flight-tracker/OZ/742?year=2026&month=03&date=07',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  )

  const result = await fetchAndExtractTrackingFlightDataByCode('oz 742', '2026-03-07')
  assert.equal(result?.flightNumber, 'OZ742')
  assert.equal(result?.departureIata, 'VTBS')
  assert.equal(result?.sourceUrl.includes('flightstats.com'), true)
})

test('returns minimal fallback data for flight code when proxy fails', async () => {
  mockFetchWithResponse(
    new Response(JSON.stringify({ error: 'upstream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  const result = await fetchAndExtractTrackingFlightDataByCode('oz742', '2026-03-07')
  assert.equal(result?.flightNumber, 'OZ742')
  assert.equal(result?.scheduledDepartureDate, '2026-03-07')
  assert.equal(result?.sourceUrl, 'flight-code:OZ742')
})
