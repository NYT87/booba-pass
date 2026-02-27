import Dexie, { type Table } from 'dexie'
import type { Airline, Flight, Membership } from '../types'

class BoobaPassDB extends Dexie {
  flights!: Table<Flight, number>
  memberships!: Table<Membership, number>
  airlines!: Table<Airline, number>

  constructor() {
    super('booba-pass')
    this.version(3).stores({
      flights: '++id, scheduledDepartureDate, departureIata, arrivalIata, airline, flightNumber',
      memberships: '++id, airlineName, programName, membershipNumber',
    })
    this.version(4).stores({
      flights:
        '++id, scheduledDepartureDate, departureIata, arrivalIata, airline, flightNumber, membershipId, mileageGranted',
      memberships: '++id, airlineName, programName, membershipNumber',
    })
    this.version(5).stores({
      flights:
        '++id, scheduledDepartureDate, departureIata, arrivalIata, airline, flightNumber, membershipId, mileageGranted',
      memberships: '++id, airlineName, programName, membershipNumber',
      airlines: '++id, name',
    })
  }
}

export const db = new BoobaPassDB()
