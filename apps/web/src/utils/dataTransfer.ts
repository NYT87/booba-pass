import type { Airline, Flight, Membership, Trip, TripPayment } from '../types'
import { db } from '../db/db'

type ImportMode = 'auto' | 'single-flight' | 'memberships-only'

type SingleFlightExportPayload = {
  kind: 'single-flight'
  version: 1
  exportedAt: string
  flight: Flight
}

type MembershipsExportPayload = {
  kind: 'memberships-only'
  version: 1
  exportedAt: string
  memberships: Membership[]
}

const downloadJsonFile = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'flight'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isTripPayment = (value: TripPayment | null): value is TripPayment => Boolean(value)

const isSingleFlightPayload = (value: unknown): value is SingleFlightExportPayload =>
  isRecord(value) && value.kind === 'single-flight' && isRecord(value.flight)

const isMembershipsOnlyPayload = (value: unknown): value is MembershipsExportPayload =>
  isRecord(value) && value.kind === 'memberships-only' && Array.isArray(value.memberships)

const looksLikeFlightRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.airline === 'string' &&
  typeof value.flightNumber === 'string' &&
  typeof value.scheduledDepartureDate === 'string'

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

const normalizeSeatClass = (value: unknown): Flight['seatClass'] => {
  if (value === 'Business' || value === 'First' || value === 'Economy') return value
  return 'Economy'
}

const normalizeTripPayment = (raw: unknown): TripPayment | null => {
  if (!isRecord(raw)) return null
  const price = isRecord(raw.price) ? raw.price : {}
  const description = typeof raw.description === 'string' ? raw.description.trim() : ''
  const amount = toNumberOrUndefined(price.amount) ?? 0
  const currency = typeof price.currency === 'string' ? price.currency.trim().toUpperCase() : ''

  if (!description || amount <= 0 || !currency) return null

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    description,
    price: {
      amount,
      currency,
    },
  }
}

function normalizeImportedFlight(raw: Record<string, unknown>): Omit<Flight, 'id'> {
  const normalized = { ...raw } as Omit<Flight, 'id'>
  normalized.distanceKm = toNumberOrUndefined(raw.distanceKm) ?? 0
  normalized.membershipId = toIntOrUndefined(raw.membershipId)
  normalized.mileageGranted = toIntOrUndefined(raw.mileageGranted)
  normalized.seatClass = normalizeSeatClass(raw.seatClass)
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
  normalized.codeType = normalized.qrCodeValue ? 'QR' : normalized.barcodeValue ? 'BARCODE' : 'NONE'

  return normalized
}

function normalizeImportedTrip(
  raw: Record<string, unknown>,
  flightIdRemap = new Map<number, number>()
): Omit<Trip, 'id'> {
  const rawFlightIds = Array.isArray(raw.flightIds) ? raw.flightIds : []
  const flightIds = rawFlightIds
    .map((value) => toIntOrUndefined(value))
    .filter((value): value is number => value !== undefined)
    .map((value) => flightIdRemap.get(value) ?? value)

  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled Trip',
    startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
    endDate: typeof raw.endDate === 'string' ? raw.endDate : typeof raw.startDate === 'string' ? raw.startDate : '',
    cities: Array.isArray(raw.cities) ? raw.cities.map((city) => String(city).trim()).filter(Boolean) : [],
    flightIds: Array.from(new Set(flightIds)),
    payments: Array.isArray(raw.payments) ? raw.payments.map(normalizeTripPayment).filter(isTripPayment) : [],
  }
}

function normalizeTripForExport(trip: Trip): Trip {
  return {
    ...trip,
    name: trip.name.trim() || 'Untitled Trip',
    startDate: trip.startDate,
    endDate: trip.endDate || trip.startDate,
    cities: (trip.cities ?? []).map((city) => String(city).trim()).filter(Boolean),
    flightIds: Array.from(new Set((trip.flightIds ?? []).filter((flightId) => Number.isFinite(flightId)))),
    payments: (trip.payments ?? []).map(normalizeTripPayment).filter(isTripPayment),
  }
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

async function upsertFlightAndGetId(flight: Omit<Flight, 'id'>): Promise<number | undefined> {
  await smartUpsert(flight)
  const stored = await db.flights
    .where({
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      scheduledDepartureDate: flight.scheduledDepartureDate,
    })
    .first()
  return stored?.id
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

async function smartUpsertTrip(trip: Omit<Trip, 'id'>, sourceId?: number) {
  if (sourceId !== undefined) {
    const existingById = await db.trips.get(sourceId)
    if (existingById) {
      return db.trips.update(sourceId, trip)
    }
  }

  const existing = await db.trips
    .where({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
    })
    .first()

  if (existing) {
    return db.trips.update(existing.id!, trip)
  } else {
    return db.trips.add(trip)
  }
}

async function upsertMembershipAndGetId(membership: Omit<Membership, 'id'>): Promise<number | undefined> {
  await smartUpsertMembership(membership)
  const stored = await db.memberships
    .where({
      airlineName: membership.airlineName,
      membershipNumber: membership.membershipNumber,
    })
    .first()
  return stored?.id
}

export const exportToJSON = (flights: Flight[], memberships: Membership[], airlines: Airline[], trips: Trip[]) => {
  const bundle = {
    version: 7,
    exportedAt: new Date().toISOString(),
    flights,
    memberships,
    airlines,
    trips: trips.map(normalizeTripForExport),
  }
  downloadJsonFile(bundle, `booba-pass-bundle-${new Date().toISOString().slice(0, 10)}.json`)
}

export const exportSingleFlightToJSON = (flight: Flight) => {
  const payload: SingleFlightExportPayload = {
    kind: 'single-flight',
    version: 1,
    exportedAt: new Date().toISOString(),
    flight,
  }
  const route = `${sanitizeFilenamePart(flight.departureIata)}-${sanitizeFilenamePart(flight.arrivalIata)}`
  const flightNumber = sanitizeFilenamePart(flight.flightNumber)
  downloadJsonFile(payload, `booba-pass-flight-${flight.scheduledDepartureDate}-${route}-${flightNumber}.json`)
}

export const exportMembershipsToJSON = (memberships: Membership[]) => {
  const payload: MembershipsExportPayload = {
    kind: 'memberships-only',
    version: 1,
    exportedAt: new Date().toISOString(),
    memberships,
  }
  downloadJsonFile(payload, `booba-pass-memberships-${new Date().toISOString().slice(0, 10)}.json`)
}

async function smartUpsertAirline(airline: Omit<Airline, 'id'>) {
  const normalizedName = airline.name.trim().toUpperCase()
  if (!normalizedName || !airline.image) return

  const existing = await db.airlines.filter((a) => a.name.trim().toUpperCase() === normalizedName).first()
  if (existing?.id !== undefined) {
    return db.airlines.update(existing.id, { name: normalizedName, image: airline.image })
  }
  return db.airlines.add({ name: normalizedName, image: airline.image })
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

const importSingleFlight = async (payload: unknown): Promise<{ success: number; failed: number }> => {
  const rawFlight = isSingleFlightPayload(payload) ? payload.flight : payload
  if (!looksLikeFlightRecord(rawFlight)) {
    throw new Error('The selected JSON file is not a single-flight export.')
  }

  const data = { ...rawFlight }
  delete data.id
  await smartUpsert(normalizeImportedFlight(data))
  return { success: 1, failed: 0 }
}

const importMembershipsOnly = async (payload: unknown): Promise<{ success: number; failed: number }> => {
  const rawMemberships = isMembershipsOnlyPayload(payload)
    ? payload.memberships
    : Array.isArray(payload)
      ? payload
      : isRecord(payload) && Array.isArray(payload.memberships)
        ? payload.memberships
        : null

  if (!rawMemberships) {
    throw new Error('The selected JSON file is not a memberships export.')
  }

  let success = 0
  let failed = 0

  for (const membership of rawMemberships) {
    if (membership.airlineName && membership.membershipNumber) {
      const data = { ...(membership as Record<string, unknown>) }
      delete data.id
      await smartUpsertMembership(normalizeImportedMembership(data))
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}

export const handleImportFile = async (
  file: File,
  options: { mode?: ImportMode } = {}
): Promise<{ success: number; failed: number }> => {
  const mode = options.mode ?? 'auto'
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

          if (mode === 'single-flight') {
            resolve(await importSingleFlight(bundle))
            return
          }
          if (mode === 'memberships-only') {
            resolve(await importMembershipsOnly(bundle))
            return
          }

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
          else if (bundle.flights || bundle.memberships || bundle.trips) {
            const membershipIdRemap = new Map<number, number>()
            const flightIdRemap = new Map<number, number>()

            if (bundle.memberships && Array.isArray(bundle.memberships)) {
              for (const m of bundle.memberships) {
                if (m.airlineName && m.membershipNumber) {
                  const sourceId =
                    typeof (m as Record<string, unknown>).id === 'number'
                      ? ((m as Record<string, unknown>).id as number)
                      : undefined
                  const data = { ...(m as Record<string, unknown>) }
                  delete data.id
                  const normalizedMembership = normalizeImportedMembership(data)
                  const storedId = await upsertMembershipAndGetId(normalizedMembership)
                  if (sourceId !== undefined && storedId !== undefined) {
                    membershipIdRemap.set(sourceId, storedId)
                  }
                  success++
                } else {
                  failed++
                }
              }
            }

            if (bundle.flights && Array.isArray(bundle.flights)) {
              for (const f of bundle.flights) {
                if (f.airline && f.flightNumber && f.scheduledDepartureDate) {
                  const sourceId =
                    typeof (f as Record<string, unknown>).id === 'number'
                      ? ((f as Record<string, unknown>).id as number)
                      : undefined
                  const data = { ...(f as Record<string, unknown>) }
                  delete data.id
                  const normalizedFlight = normalizeImportedFlight(data)

                  if (
                    normalizedFlight.membershipId !== undefined &&
                    membershipIdRemap.has(normalizedFlight.membershipId)
                  ) {
                    normalizedFlight.membershipId = membershipIdRemap.get(normalizedFlight.membershipId)
                  }

                  const storedId = await upsertFlightAndGetId(normalizedFlight)
                  if (sourceId !== undefined && storedId !== undefined) {
                    flightIdRemap.set(sourceId, storedId)
                  }
                  success++
                } else {
                  failed++
                }
              }
            }

            if (bundle.airlines && Array.isArray(bundle.airlines)) {
              for (const a of bundle.airlines) {
                if (a.name && a.image) {
                  const data = { ...(a as Record<string, unknown>) } as Omit<Airline, 'id'>
                  await smartUpsertAirline({
                    name: String(data.name),
                    image: String(data.image),
                  })
                  success++
                } else {
                  failed++
                }
              }
            }

            if (bundle.trips && Array.isArray(bundle.trips)) {
              for (const trip of bundle.trips) {
                if (trip.name && trip.startDate) {
                  const sourceId =
                    typeof (trip as Record<string, unknown>).id === 'number'
                      ? ((trip as Record<string, unknown>).id as number)
                      : undefined
                  const data = { ...(trip as Record<string, unknown>) }
                  delete data.id
                  await smartUpsertTrip(normalizeImportedTrip(data, flightIdRemap), sourceId)
                  success++
                } else {
                  failed++
                }
              }
            }
          }
          // Case 3: Dedicated single-flight JSON
          else if (isSingleFlightPayload(bundle) || looksLikeFlightRecord(bundle)) {
            const result = await importSingleFlight(bundle)
            success += result.success
            failed += result.failed
          }
          // Case 4: Dedicated memberships-only JSON
          else if (isMembershipsOnlyPayload(bundle)) {
            const result = await importMembershipsOnly(bundle)
            success += result.success
            failed += result.failed
          }
        }
        // Handle CSV (Flights only)
        else if (file.name.endsWith('.csv')) {
          if (mode === 'single-flight' || mode === 'memberships-only') {
            throw new Error(
              `${mode === 'single-flight' ? 'Single-flight' : 'Membership-only'} import only supports JSON files.`
            )
          }

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
