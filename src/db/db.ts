import Dexie, { type Table } from 'dexie'
import type { Flight, Membership } from '../types'

class BoobaPassDB extends Dexie {
  flights!: Table<Flight, number>
  memberships!: Table<Membership, number>

  constructor() {
    super('booba-pass')
    this.version(3).stores({
      flights: '++id, scheduledDepartureDate, departureIata, arrivalIata, airline, flightNumber',
      memberships: '++id, airlineName, programName, membershipNumber',
    })
  }
}

export const db = new BoobaPassDB()
