import type { Flight, Membership } from '../types'
import { db } from '../db/db'

const toIntOrUndefined = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number.parseFloat(String(value))
  return Number.isNaN(parsed) ? undefined : parsed
}

function normalizeImportedFlight(raw: Record<string, unknown>): Omit<Flight, 'id'> {
  const normalized = { ...raw } as Omit<Flight, 'id'>
  normalized.distanceKm = toNumberOrUndefined(raw.distanceKm) ?? 0
  normalized.membershipId = toIntOrUndefined(raw.membershipId)
  normalized.mileageGranted = toIntOrUndefined(raw.mileageGranted)
  return normalized
}

function normalizeImportedMembership(raw: Record<string, unknown>): Omit<Membership, 'id'> {
  const normalized = { ...raw } as Omit<Membership, 'id'>
  const legacyValue = typeof raw.codeValue === 'string' ? raw.codeValue : undefined
  const legacyType = raw.codeType

  if (!normalized.qrCodeValue && legacyType === 'QR') {
    normalized.qrCodeValue = legacyValue
  }
  if (!normalized.barcodeValue && legacyType === 'BARCODE') {
    normalized.barcodeValue = legacyValue
  }

  // Keep legacy fields synced for backward compatibility.
  normalized.codeValue = normalized.qrCodeValue ?? normalized.barcodeValue
  normalized.codeType = normalized.qrCodeValue
    ? 'QR'
    : normalized.barcodeValue
      ? 'BARCODE'
      : 'NONE'

  return normalized
}

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
    .first()

  if (existing) {
    return db.flights.update(existing.id!, flight)
  } else {
    return db.flights.add(flight)
  }
}

/**
 * Smart Upsert for Memberships: Update if matching airline and number exists.
 */
async function smartUpsertMembership(membership: Omit<Membership, 'id'>) {
  const existing = await db.memberships
    .where({
      airlineName: membership.airlineName,
      membershipNumber: membership.membershipNumber,
    })
    .first()

  if (existing) {
    return db.memberships.update(existing.id!, membership)
  } else {
    return db.memberships.add(membership)
  }
}

export const exportToJSON = (flights: Flight[], memberships: Membership[]) => {
  const bundle = {
    version: 4,
    exportedAt: new Date().toISOString(),
    flights,
    memberships,
  }
  const data = JSON.stringify(bundle, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `booba-pass-bundle-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const exportToCSV = (flights: Flight[]) => {
  if (flights.length === 0) return

  // Exclude complex fields like photos for CSV
  const headers = [
    'departureIata',
    'arrivalIata',
    'departureCity',
    'arrivalCity',
    'scheduledDepartureDate',
    'scheduledDepartureTime',
    'scheduledArrivalDate',
    'scheduledArrivalTime',
    'airline',
    'flightNumber',
    'seatClass',
    'seat',
    'aircraft',
    'notes',
    'distanceKm',
    'membershipId',
    'mileageGranted',
    'boardingPassDataUrl',
  ]

  const csvRows = flights.map((f) => {
    return headers
      .map((header) => {
        const val = (f as unknown as Record<string, unknown>)[header] ?? ''
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
  })

  const csvContent = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `booba-pass-flights-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const handleImportFile = async (
  file: File
): Promise<{ success: number; failed: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        let success = 0
        let failed = 0

        // Handle JSON Bundle
        if (file.name.endsWith('.json')) {
          const bundle = JSON.parse(content)

          // Case 1: Legacy format (just an array of flights)
          if (Array.isArray(bundle)) {
            for (const f of bundle) {
              if (f.airline && f.flightNumber && f.scheduledDepartureDate) {
                const data = { ...(f as Record<string, unknown>) }
                delete data.id
                await smartUpsert(normalizeImportedFlight(data))
                success++
              } else {
                failed++
              }
            }
          }
          // Case 2: New Bundle format
          else if (bundle.flights || bundle.memberships) {
            if (bundle.flights && Array.isArray(bundle.flights)) {
              for (const f of bundle.flights) {
                if (f.airline && f.flightNumber && f.scheduledDepartureDate) {
                  const data = { ...(f as Record<string, unknown>) }
                  delete data.id
                  await smartUpsert(normalizeImportedFlight(data))
                  success++
                } else {
                  failed++
                }
              }
            }
            if (bundle.memberships && Array.isArray(bundle.memberships)) {
              for (const m of bundle.memberships) {
                if (m.airlineName && m.membershipNumber) {
                  const data = { ...(m as Record<string, unknown>) }
                  delete data.id
                  await smartUpsertMembership(normalizeImportedMembership(data))
                  // We don't count these in the flight success count for now to keep UI simple,
                  // or we could combine. Let's combine for the "success" count.
                  success++
                } else {
                  failed++
                }
              }
            }
          }
        }
        // Handle CSV (Flights only)
        else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n')
          const headers = lines[0].split(',').map((h: string) => h.replace(/"/g, '').trim())
          const flights = lines
            .slice(1)
            .filter((l: string) => l.trim())
            .map((line: string) => {
              const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
              const obj: Record<string, unknown> = {}
              headers.forEach((h: string, i: number) => {
                const val = values[i]?.replace(/^"|"$/g, '').replace(/""/g, '"') || ''
                if (h === 'distanceKm') obj[h] = toNumberOrUndefined(val)
                else if (h === 'membershipId' || h === 'mileageGranted') obj[h] = toIntOrUndefined(val)
                else obj[h] = val
              })
              return obj
            })

          for (const f of flights) {
            if (f.airline && f.flightNumber && f.scheduledDepartureDate) {
              const data = { ...(f as Record<string, unknown>) }
              delete data.id
              await smartUpsert(normalizeImportedFlight(data))
              success++
            } else {
              failed++
            }
          }
        }

        resolve({ success, failed })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsText(file)
  })
}
