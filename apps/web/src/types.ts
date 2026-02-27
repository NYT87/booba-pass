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

/** Returns duration in minutes from two date+time strings */
export function computeDurationMin(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  startTimeZone?: string,
  endTimeZone?: string
): number {
  if (!startTimeZone || !endTimeZone) {
    // Fallback to local browser time if timezones missing
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${endDate}T${endTime}:00`)
    return Math.round((end.getTime() - start.getTime()) / 60000)
  }

  const getUTC = (dateStr: string, timeStr: string, timeZone: string) => {
    // Create UTC date assuming the string is UTC
    const utcDate = new Date(`${dateStr}T${timeStr}:00Z`)
    // Format it in the TARGET timezone
    const localStr = utcDate.toLocaleString('en-US', { timeZone, hour12: false })
    // This gives something like "2/20/2026, 00:15:00"
    // We want to know the difference between the target timezone and UTC
    const localDate = new Date(localStr)
    const offset = utcDate.getTime() - localDate.getTime()
    return utcDate.getTime() + offset
  }

  const startUTC = getUTC(startDate, startTime, startTimeZone)
  const endUTC = getUTC(endDate, endTime, endTimeZone)

  return Math.round((endUTC - startUTC) / 60000)
}

/** Returns effective duration in minutes (actual if available, else scheduled) */
export function flightDurationMin(f: Flight): number {
  if (
    f.actualDepartureDate &&
    f.actualDepartureTime &&
    f.actualArrivalDate &&
    f.actualArrivalTime
  ) {
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

export function formatDuration(minutes: number): string {
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

export function isUpcoming(f: Flight): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return f.scheduledDepartureDate >= today
}
