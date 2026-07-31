export interface Airport {
  iata: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  timezone?: string
}

export interface Airline {
  id?: number
  name: string
  image: string
}

export interface Flight {
  id?: number

  // Airports
  departureIata: string
  arrivalIata: string
  departureCity: string
  arrivalCity: string
  departureLat: number
  departureLon: number
  arrivalLat: number
  arrivalLon: number

  // Scheduled times
  scheduledDepartureDate: string // "YYYY-MM-DD"
  scheduledDepartureTime: string // "HH:MM"
  scheduledArrivalDate: string
  scheduledArrivalTime: string

  // Actual times (post-flight, for delays)
  actualDepartureDate?: string
  actualDepartureTime?: string
  actualArrivalDate?: string
  actualArrivalTime?: string

  // Flight info
  airline: string
  flightNumber: string
  seatClass: 'Economy' | 'Business' | 'First'
  seat?: string
  distanceKm: number
  aircraft?: string
  notes?: string
  trackUrl?: string
  departureTimeZone?: string
  arrivalTimeZone?: string
  photoDataUrls?: string[]
  boardingPassDataUrl?: string
  membershipId?: number
  mileageGranted?: number
}

export type MembershipCodeType = 'QR' | 'BARCODE' | 'NONE'

export interface Membership {
  id?: number
  airlineName: string
  programName: string
  allianceGroup?: string
  memberName: string
  membershipNumber: string
  qrCodeValue?: string
  barcodeValue?: string
  // Legacy fields kept for backward compatibility with existing stored/imported records.
  codeValue?: string
  codeType?: MembershipCodeType
  notes?: string
}

const zonedDateTimeToUtcMs = (dateStr: string, timeStr: string, timeZone: string): number => {
  const [year, month, day] = dateStr.split('-').map((part) => Number.parseInt(part, 10))
  const [hour, minute] = timeStr.split(':').map((part) => Number.parseInt(part, 10))

  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return Number.NaN
  }

  const targetUtcEquivalent = Date.UTC(year, month - 1, day, hour, minute, 0)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  let utcGuess = targetUtcEquivalent

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(utcGuess))
    const map = Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
    )
    const observedUtcEquivalent = Date.UTC(
      Number.parseInt(map.year, 10),
      Number.parseInt(map.month, 10) - 1,
      Number.parseInt(map.day, 10),
      Number.parseInt(map.hour, 10),
      Number.parseInt(map.minute, 10),
      Number.parseInt(map.second, 10)
    )
    const delta = targetUtcEquivalent - observedUtcEquivalent
    utcGuess += delta

    if (delta === 0) {
      break
    }
  }

  return utcGuess
}

/** Returns duration in minutes from two date+time strings */
export function computeDurationMin(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  startTimeZone?: string,
  endTimeZone?: string
): number {
  if (!startDate || !startTime || !endDate || !endTime) {
    return 0
  }

  if (!startTimeZone || !endTimeZone) {
    // Fallback to local browser time if timezones missing
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${endDate}T${endTime}:00`)
    const diff = Math.round((end.getTime() - start.getTime()) / 60000)
    return Number.isFinite(diff) && diff > 0 ? diff : 0
  }

  const startUTC = zonedDateTimeToUtcMs(startDate, startTime, startTimeZone)
  const endUTC = zonedDateTimeToUtcMs(endDate, endTime, endTimeZone)

  const diff = Math.round((endUTC - startUTC) / 60000)
  return Number.isFinite(diff) && diff > 0 ? diff : 0
}

/** Returns effective duration in minutes (actual if available, else scheduled) */
export function flightDurationMin(f: Flight): number {
  if (f.actualDepartureDate && f.actualDepartureTime && f.actualArrivalDate && f.actualArrivalTime) {
    return computeDurationMin(
      f.actualDepartureDate,
      f.actualDepartureTime,
      f.actualArrivalDate,
      f.actualArrivalTime,
      f.departureTimeZone,
      f.arrivalTimeZone
    )
  }
  return computeDurationMin(
    f.scheduledDepartureDate,
    f.scheduledDepartureTime,
    f.scheduledArrivalDate,
    f.scheduledArrivalTime,
    f.departureTimeZone,
    f.arrivalTimeZone
  )
}

export function scheduledDepartureSortKey(
  flight: Pick<Flight, 'scheduledDepartureDate' | 'scheduledDepartureTime'>
): string {
  return `${flight.scheduledDepartureDate}T${flight.scheduledDepartureTime || '00:00'}`
}

export function compareFlightsByScheduledDepartureDesc(
  a: Pick<Flight, 'scheduledDepartureDate' | 'scheduledDepartureTime'>,
  b: Pick<Flight, 'scheduledDepartureDate' | 'scheduledDepartureTime'>
): number {
  return scheduledDepartureSortKey(b).localeCompare(scheduledDepartureSortKey(a))
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h 00m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/** Haversine great-circle distance in km */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function normalizeAircraft(value: string): string {
  return value
    .toUpperCase()
    .replace(/\b(?:AIRBUS|BOEING)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isUpcoming(f: Flight): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return f.scheduledDepartureDate >= today
}
