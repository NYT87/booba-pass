import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { flightDurationMin, isUpcoming } from '../types'
import type { Flight } from '../types'

export function useFlights(filter: 'all' | 'past' | 'upcoming' = 'all') {
  return useLiveQuery(async () => {
    const all = await db.flights.orderBy('scheduledDepartureDate').reverse().toArray()
    if (filter === 'past') return all.filter((f) => !isUpcoming(f))
    if (filter === 'upcoming') return all.filter((f) => isUpcoming(f))
    return all
  }, [filter])
}

export function useFlightById(id: number | undefined) {
  return useLiveQuery(() => (id !== undefined ? db.flights.get(id) : undefined), [id])
}

export function useFlightsByMembership(membershipId: number | undefined) {
  return useLiveQuery(async () => {
    if (membershipId === undefined) return []
    const flights = await db.flights.where('membershipId').equals(membershipId).toArray()
    return flights.sort((a, b) => {
      const aDate = `${a.scheduledDepartureDate}T${a.scheduledDepartureTime ?? '00:00'}`
      const bDate = `${b.scheduledDepartureDate}T${b.scheduledDepartureTime ?? '00:00'}`
      return bDate.localeCompare(aDate)
    })
  }, [membershipId])
}

export interface FlightStats {
  totalFlights: number
  totalDistanceKm: number
  totalDurationMin: number
  flightsByMonth: { month: string; count: number }[]
  airplanes: { aircraft: string; count: number }[]
  airlines: { airline: string; count: number }[]
}

export function useStats(year?: number): FlightStats | undefined {
  return useLiveQuery(async () => {
    let flights = await db.flights.toArray()
    if (year) {
      flights = flights.filter((f) => f.scheduledDepartureDate.startsWith(String(year)))
    }

    const totalFlights = flights.length
    const totalDistanceKm = Math.round(flights.reduce((s, f) => s + f.distanceKm, 0))
    const totalDurationMin = flights.reduce((s, f) => s + flightDurationMin(f), 0)

    const monthMap: Record<string, number> = {}
    for (const f of flights) {
      const m = f.scheduledDepartureDate.slice(0, 7) // "YYYY-MM"
      monthMap[m] = (monthMap[m] ?? 0) + 1
    }
    const flightsByMonth = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))

    const aircraftMap: Record<string, number> = {}
    for (const f of flights) {
      if (f.aircraft) {
        aircraftMap[f.aircraft] = (aircraftMap[f.aircraft] ?? 0) + 1
      }
    }
    const airplanes = Object.entries(aircraftMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([aircraft, count]) => ({ aircraft, count }))

    const airlineMap: Record<string, number> = {}
    for (const f of flights) {
      airlineMap[f.airline] = (airlineMap[f.airline] ?? 0) + 1
    }
    const airlines = Object.entries(airlineMap)
      .sort(([, a], [, b]) => b - a)
      .map(([airline, count]) => ({ airline, count }))

    return { totalFlights, totalDistanceKm, totalDurationMin, flightsByMonth, airplanes, airlines }
  }, [year])
}

export async function saveFlight(flight: Omit<Flight, 'id'> & { id?: number }) {
  if (flight.id !== undefined) {
    await db.flights.put(flight as Flight)
    return flight.id
  }
  return db.flights.add(flight as Flight)
}

export async function deleteFlight(id: number) {
  await db.flights.delete(id)
}
