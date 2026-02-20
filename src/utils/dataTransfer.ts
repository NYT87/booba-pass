import type { Flight } from '../types';
import { db } from '../db/db';

/**
 * Smart Upsert: Update if matching flight exists, otherwise add.
 * Matching criteria: Airline, Flight Number, and Scheduled Departure Date.
 */
async function smartUpsert(flight: Omit<Flight, 'id'>) {
  const existing = await db.flights
    .where({
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      scheduledDepartureDate: flight.scheduledDepartureDate,
    })
    .first();

  if (existing) {
    return db.flights.update(existing.id!, flight);
  } else {
    return db.flights.add(flight);
  }
}

export const exportToJSON = (flights: Flight[]) => {
  const data = JSON.stringify(flights, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `booba-pass-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToCSV = (flights: Flight[]) => {
  if (flights.length === 0) return;

  // Exclude complex fields like photos for CSV
  const headers = [
    'departureIata', 'arrivalIata', 'departureCity', 'arrivalCity',
    'scheduledDepartureDate', 'scheduledDepartureTime', 'scheduledArrivalDate', 'scheduledArrivalTime',
    'airline', 'flightNumber', 'seatClass', 'seat', 'aircraft', 'notes', 'distanceKm'
  ];

  const csvRows = flights.map(f => {
    return headers.map(header => {
      const val = (f as any)[header] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `booba-pass-flights-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const handleImportFile = async (file: File): Promise<{ success: number; failed: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let flights: any[] = [];

        if (file.name.endsWith('.json')) {
          flights = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          flights = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const obj: any = {};
            headers.forEach((h, i) => {
              let val = values[i]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '';
              if (h === 'distanceKm') obj[h] = parseFloat(val);
              else obj[h] = val;
            });
            return obj;
          });
        }

        let success = 0;
        let failed = 0;

        for (const f of flights) {
          try {
            // Basic validation
            if (f.airline && f.flightNumber && f.scheduledDepartureDate) {
              const { id, ...data } = f; // Remove existing ID if present to let DB/Upsert handle it
              await smartUpsert(data);
              success++;
            } else {
              failed++;
            }
          } catch (err) {
            console.error('Import row failed', err);
            failed++;
          }
        }
        resolve({ success, failed });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
};
