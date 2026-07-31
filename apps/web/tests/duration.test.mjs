import assert from 'node:assert/strict'
import test from 'node:test'

import { compareFlightsByScheduledDepartureDesc, computeDurationMin } from '../src/types.ts'

test('computes duration across different airport timezones', () => {
  const duration = computeDurationMin('2026-05-22', '12:50', '2026-05-22', '14:00', 'Asia/Seoul', 'Asia/Shanghai')

  assert.equal(duration, 130)
})

test('computes duration correctly for a westbound long-haul flight with DST', () => {
  const duration = computeDurationMin('2026-07-31', '12:35', '2026-07-31', '17:35', 'Asia/Seoul', 'Europe/London')

  assert.equal(duration, 780)
})

test('falls back to browser-local parsing when timezone data is missing', () => {
  const duration = computeDurationMin('2026-07-31', '09:00', '2026-07-31', '11:45')

  assert.equal(duration, 165)
})

test('sorts same-day flights by scheduled departure time descending', () => {
  const flights = [
    { scheduledDepartureDate: '2017-09-07', scheduledDepartureTime: '12:35' },
    { scheduledDepartureDate: '2017-09-07', scheduledDepartureTime: '08:10' },
    { scheduledDepartureDate: '2017-09-08', scheduledDepartureTime: '06:00' },
  ]

  flights.sort(compareFlightsByScheduledDepartureDesc)

  assert.deepEqual(flights, [
    { scheduledDepartureDate: '2017-09-08', scheduledDepartureTime: '06:00' },
    { scheduledDepartureDate: '2017-09-07', scheduledDepartureTime: '12:35' },
    { scheduledDepartureDate: '2017-09-07', scheduledDepartureTime: '08:10' },
  ])
})
