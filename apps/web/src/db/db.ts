import Dexie, { type Table } from 'dexie'
import type { Airline, Flight, Membership, Trip } from '../types'

class BoobaPassDB extends Dexie {
  flights!: Table<Flight, number>
  memberships!: Table<Membership, number>
  airlines!: Table<Airline, number>
  trips!: Table<Trip, number>

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
    this.version(6).stores({
      flights:
        '++id, scheduledDepartureDate, departureIata, arrivalIata, airline, flightNumber, membershipId, mileageGranted',
      memberships: '++id, airlineName, programName, membershipNumber',
      airlines: '++id, name',
      trips: '++id, startDate, endDate, name',
    })
  }
}

export const db = new BoobaPassDB()
