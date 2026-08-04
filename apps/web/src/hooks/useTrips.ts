import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Flight, Trip } from '../types'
import { compareFlightsByScheduledDepartureDesc } from '../types'

export const compareTripsByStartDateDesc = (
  a: Pick<Trip, 'startDate' | 'endDate'>,
  b: Pick<Trip, 'startDate' | 'endDate'>
) => `${b.startDate}T${b.endDate || b.startDate}`.localeCompare(`${a.startDate}T${a.endDate || a.startDate}`)

export const isUpcomingTrip = (trip: Pick<Trip, 'endDate'>) => trip.endDate >= new Date().toISOString().slice(0, 10)

export function useTrips() {
  return useLiveQuery(async () => {
    const trips = await db.trips.toArray()
    return trips.sort(compareTripsByStartDateDesc)
  }, [])
}

export function useTripById(id: number | undefined) {
  return useLiveQuery(() => (id !== undefined ? db.trips.get(id) : undefined), [id])
}

export function useTripFlights(trip: Trip | undefined) {
  return useLiveQuery(async () => {
    if (!trip?.flightIds.length) return []
    const flights = await db.flights.bulkGet(trip.flightIds)
    return flights.filter((flight): flight is Flight => Boolean(flight)).sort(compareFlightsByScheduledDepartureDesc)
  }, [trip?.id, trip?.flightIds.join(',')])
}

export async function saveTrip(trip: Omit<Trip, 'id'> & { id?: number }) {
  const normalized: Omit<Trip, 'id'> & { id?: number } = {
    ...trip,
    name: trip.name.trim(),
    cities: trip.cities.map((city) => city.trim()).filter(Boolean),
    flightIds: Array.from(new Set(trip.flightIds.filter((flightId) => Number.isFinite(flightId)))),
    payments: (trip.payments ?? [])
      .map((payment) => ({
        ...payment,
        description: payment.description.trim(),
        price: {
          amount: payment.price.amount,
          currency: payment.price.currency.trim().toUpperCase(),
        },
      }))
      .filter((payment) => payment.description && Number.isFinite(payment.price.amount) && payment.price.currency),
  }

  if (normalized.id !== undefined) {
    await db.trips.put(normalized as Trip)
    return normalized.id
  }
  return db.trips.add(normalized as Trip)
}

export async function deleteTrip(id: number) {
  await db.trips.delete(id)
}

export async function linkFlightToTrip(trip: Trip, flightId: number) {
  if (trip.id === undefined || trip.flightIds.includes(flightId)) return
  await db.trips.update(trip.id, {
    flightIds: [...trip.flightIds, flightId],
  })
}

export async function unlinkFlightFromTrip(trip: Trip, flightId: number) {
  if (trip.id === undefined) return
  await db.trips.update(trip.id, {
    flightIds: trip.flightIds.filter((id) => id !== flightId),
  })
}
