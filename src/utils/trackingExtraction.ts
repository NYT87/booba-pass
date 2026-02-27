export interface ExtractedTrackingFlightData {
  airline?: string
  airlineImage?: string
  flightNumber?: string
  departureIata?: string
  arrivalIata?: string
  scheduledDepartureDate?: string
  scheduledDepartureTime?: string
  scheduledArrivalDate?: string
  scheduledArrivalTime?: string
  actualDepartureDate?: string
  actualDepartureTime?: string
  actualArrivalDate?: string
  actualArrivalTime?: string
  timesInUtc?: boolean
  aircraft?: string
  sourceUrl: string
}

const AIRCRAFT_PATTERN =
  /\b(AIRBUS\s*A\d{3}(?:-\d{3})?|BOEING\s*7\d{2}(?:-\d{3})?|A\d{3}(?:-\d{3})?|B7\d{2}(?:-\d{3})?)\b/i

function normalizeDateTime(dateTime: string): { date: string; time: string } | null {
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  }
}

function cleanFlightNumber(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '')
}

function extractDateTimeNearLabel(
  source: string,
  labelPattern: RegExp
): { date: string; time: string } | null {
  const labelMatch = source.match(labelPattern)
  if (!labelMatch || labelMatch.index === undefined) return null

  const chunk = source.slice(labelMatch.index, labelMatch.index + 260)

  const iso = chunk.match(
    /\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/i
  )
  if (iso?.[1]) return normalizeDateTime(iso[1])

  const human = chunk.match(
    /\b([A-Z][a-z]{2,8}\s+\d{1,2},\s*20\d{2}\s+\d{1,2}:\d{2}\s*(?:AM|PM)(?:\s*[A-Z]{2,5})?)\b/i
  )
  if (human?.[1]) return normalizeDateTime(human[1])

  return null
}

function extractFromTrackingUrl(trackUrl: string): Partial<ExtractedTrackingFlightData> | null {
  // Example: /live/flight/AAR747/history/20260206/0810Z/RKSI/VTSP
  const match = trackUrl.match(
    /\/live\/flight\/([^/]+)\/history\/(\d{8})\/(\d{4})Z\/([A-Z]{3,4})\/([A-Z]{3,4})/i
  )
  if (!match) return null

  const [, flightNoRaw, yyyymmdd, hhmm, dep, arr] = match
  const date = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
  const time = `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`

  return {
    flightNumber: cleanFlightNumber(flightNoRaw),
    departureIata: dep.toUpperCase(),
    arrivalIata: arr.toUpperCase(),
    scheduledDepartureDate: date,
    scheduledDepartureTime: time,
    timesInUtc: true,
  }
}

function extractFromJsonLd(html: string): Partial<ExtractedTrackingFlightData> {
  const scriptMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  for (const match of scriptMatches) {
    const rawJson = match[1]?.trim()
    if (!rawJson) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      continue
    }

    const nodes = Array.isArray(parsed) ? parsed : [parsed]
    for (const node of nodes) {
      const record = node as Record<string, unknown>
      const type = String(record['@type'] ?? '').toLowerCase()
      if (!type.includes('flight')) continue

      const flightNumberRaw = record.flightNumber ?? record.identifier
      const depAirport = record.departureAirport as Record<string, unknown> | undefined
      const arrAirport = record.arrivalAirport as Record<string, unknown> | undefined
      const airlineObj = record.airline as Record<string, unknown> | undefined

      const dep =
        typeof record.departureTime === 'string' ? normalizeDateTime(record.departureTime) : null
      const arr =
        typeof record.arrivalTime === 'string' ? normalizeDateTime(record.arrivalTime) : null

      return {
        airline: typeof airlineObj?.name === 'string' ? airlineObj.name : undefined,
        flightNumber:
          typeof flightNumberRaw === 'string' ? cleanFlightNumber(flightNumberRaw) : undefined,
        departureIata:
          typeof depAirport?.iataCode === 'string' ? depAirport.iataCode.toUpperCase() : undefined,
        arrivalIata:
          typeof arrAirport?.iataCode === 'string' ? arrAirport.iataCode.toUpperCase() : undefined,
        scheduledDepartureDate: dep?.date,
        scheduledDepartureTime: dep?.time,
        scheduledArrivalDate: arr?.date,
        scheduledArrivalTime: arr?.time,
      }
    }
  }

  return {}
}

function extractAirlineImageFromHtml(html: string, baseUrl?: string): string | undefined {
  const imagePatterns = [
    /https?:\/\/[^"'()\s]*airline[^"'()\s]*\.(?:png|svg|jpg|jpeg|webp)/i,
    /https?:\/\/[^"'()\s]*airline_logos?[^"'()\s]*\.(?:png|svg|jpg|jpeg|webp)/i,
    /https?:\/\/[^"'()\s]*logos?[^"'()\s]*\.(?:png|svg|jpg|jpeg|webp)/i,
    /(?:src|href)=["']([^"']*airline[^"']*\.(?:png|svg|jpg|jpeg|webp))["']/i,
  ]

  for (const pattern of imagePatterns) {
    const match = html.match(pattern)
    const raw = match?.[1] ?? match?.[0]
    if (!raw) continue
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    if (baseUrl && raw.startsWith('/')) {
      return `${new URL(baseUrl).origin}${raw}`
    }
  }

  const ogImage = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  )
  if (ogImage?.[1]) return ogImage[1]

  return undefined
}

function extractWithRegex(text: string): Partial<ExtractedTrackingFlightData> {
  const uppercaseText = text.toUpperCase()
  const extracted: Partial<ExtractedTrackingFlightData> = {}

  const scheduledDep = extractDateTimeNearLabel(text, /\b(SCHEDULED|FILED)\s+DEPART(?:URE)?\b/i)
  const scheduledArr = extractDateTimeNearLabel(text, /\b(SCHEDULED|FILED)\s+ARRIV(?:AL)?\b/i)
  const actualDep = extractDateTimeNearLabel(text, /\bACTUAL\s+DEPART(?:URE)?\b/i)
  const actualArr = extractDateTimeNearLabel(text, /\bACTUAL\s+ARRIV(?:AL)?\b/i)

  if (scheduledDep) {
    extracted.scheduledDepartureDate = scheduledDep.date
    extracted.scheduledDepartureTime = scheduledDep.time
  }
  if (scheduledArr) {
    extracted.scheduledArrivalDate = scheduledArr.date
    extracted.scheduledArrivalTime = scheduledArr.time
  }
  if (actualDep) {
    extracted.actualDepartureDate = actualDep.date
    extracted.actualDepartureTime = actualDep.time
  }
  if (actualArr) {
    extracted.actualArrivalDate = actualArr.date
    extracted.actualArrivalTime = actualArr.time
  }

  const flightNumberMatch =
    uppercaseText.match(/\b([A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?)\b/) ??
    uppercaseText.match(/\b([A-Z]{2}\d{1,4}[A-Z]?)\b/)
  if (flightNumberMatch?.[1]) {
    extracted.flightNumber = cleanFlightNumber(flightNumberMatch[1])
  }

  const routeMatch = uppercaseText.match(/\b([A-Z]{3,4})\s*(?:\/|->|→|-| TO )\s*([A-Z]{3,4})\b/)
  if (routeMatch?.[1] && routeMatch?.[2]) {
    extracted.departureIata = routeMatch[1]
    extracted.arrivalIata = routeMatch[2]
  }

  const isoDateMatches = [
    ...text.matchAll(/\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/g),
  ]
  if (isoDateMatches[0]?.[1]) {
    const dep = normalizeDateTime(isoDateMatches[0][1])
    extracted.scheduledDepartureDate = extracted.scheduledDepartureDate ?? dep?.date
    extracted.scheduledDepartureTime = extracted.scheduledDepartureTime ?? dep?.time
  }
  if (isoDateMatches[1]?.[1]) {
    const arr = normalizeDateTime(isoDateMatches[1][1])
    extracted.scheduledArrivalDate = extracted.scheduledArrivalDate ?? arr?.date
    extracted.scheduledArrivalTime = extracted.scheduledArrivalTime ?? arr?.time
  }

  const aircraftMatch = uppercaseText.match(AIRCRAFT_PATTERN)
  if (aircraftMatch?.[1]) {
    extracted.aircraft = aircraftMatch[1].replace(/\s+/g, ' ').trim()
  }

  return extracted
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/json,text/plain,*/*' },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.text()
  } finally {
    globalThis.clearTimeout(timer)
  }
}

function mergeExtracted(
  primary: Partial<ExtractedTrackingFlightData>,
  fallback: Partial<ExtractedTrackingFlightData>,
  airlineImage?: string
): Partial<ExtractedTrackingFlightData> {
  return {
    airline: primary.airline ?? fallback.airline,
    airlineImage,
    flightNumber: primary.flightNumber ?? fallback.flightNumber,
    departureIata: primary.departureIata ?? fallback.departureIata,
    arrivalIata: primary.arrivalIata ?? fallback.arrivalIata,
    scheduledDepartureDate: primary.scheduledDepartureDate ?? fallback.scheduledDepartureDate,
    scheduledDepartureTime: primary.scheduledDepartureTime ?? fallback.scheduledDepartureTime,
    scheduledArrivalDate: primary.scheduledArrivalDate ?? fallback.scheduledArrivalDate,
    scheduledArrivalTime: primary.scheduledArrivalTime ?? fallback.scheduledArrivalTime,
    actualDepartureDate: primary.actualDepartureDate ?? fallback.actualDepartureDate,
    actualDepartureTime: primary.actualDepartureTime ?? fallback.actualDepartureTime,
    actualArrivalDate: primary.actualArrivalDate ?? fallback.actualArrivalDate,
    actualArrivalTime: primary.actualArrivalTime ?? fallback.actualArrivalTime,
    aircraft: primary.aircraft ?? fallback.aircraft,
  }
}

export function extractTrackingFlightDataFromHtml(
  html: string,
  options?: { baseUrl?: string }
): Partial<ExtractedTrackingFlightData> | null {
  const fromJsonLd = extractFromJsonLd(html)
  const fromRegex = extractWithRegex(html)
  const airlineImage = extractAirlineImageFromHtml(html, options?.baseUrl)
  const merged = mergeExtracted(fromJsonLd, fromRegex, airlineImage)
  const hasAnyValue = Object.values(merged).some(Boolean)
  return hasAnyValue ? merged : null
}

export async function fetchAndExtractTrackingFlightData(
  trackUrl: string
): Promise<ExtractedTrackingFlightData | null> {
  let lastError: unknown

  try {
    const text = await fetchText(trackUrl)
    const merged = extractTrackingFlightDataFromHtml(text, { baseUrl: trackUrl })
    if (merged) {
      return {
        ...merged,
        sourceUrl: trackUrl,
      }
    }
  } catch (err) {
    lastError = err
  }

  const fromUrl = extractFromTrackingUrl(trackUrl)
  if (fromUrl) {
    return {
      ...fromUrl,
      sourceUrl: trackUrl,
    }
  }

  if (lastError) {
    throw lastError
  }
  return null
}

export { extractFromTrackingUrl }
