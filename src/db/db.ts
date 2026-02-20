import Dexie, { type Table } from 'dexie';
import type { Flight } from '../types';

class BoobaPassDB extends Dexie {
  flights!: Table<Flight, number>;

  constructor() {
    super('booba-pass');
    this.version(2).stores({
      flights: '++id, scheduledDepartureDate, departureIata, arrivalIata, airline, flightNumber',
    });
  }
}

export const db = new BoobaPassDB();
