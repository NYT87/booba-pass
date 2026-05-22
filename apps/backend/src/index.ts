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

function hasExplicitTimeZone(dateTime: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2}|\bUTC\b|\bGMT\b)$/i.test(dateTime.trim())
}

function normalizeDateTime(dateTime: string): { date: string; time: string; timesInUtc?: boolean } | null {
  const trimmed = dateTime.trim()
  const naiveIsoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (naiveIsoMatch && !hasExplicitTimeZone(trimmed)) {
    return {
      date: naiveIsoMatch[1],
      time: naiveIsoMatch[2],
    }
  }

  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
    timesInUtc: hasExplicitTimeZone(dateTime) || undefined,
  }
}

function cleanFlightNumber(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '')
}

function normalizeAircraft(value: string): string {
  return value
    .toUpperCase()
    .replace(/\b(?:AIRBUS|BOEING)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitFlightCode(value: string): { carrier: string; number: string } | null {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2,3}|[A-Z]\d)\s*[- ]?\s*(\d{1,4}[A-Z]?)$/)
  if (!match) return null
  return { carrier: match[1], number: match[2] }
}

function extractDateTimeNearLabel(
  source: string,
  labelPattern: RegExp
): { date: string; time: string; timesInUtc?: boolean } | null {
  const labelMatch = source.match(labelPattern)
  if (!labelMatch || labelMatch.index === undefined) return null

  const chunk = source.slice(labelMatch.index, labelMatch.index + 260)

  const iso = chunk.match(/\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/i)
  if (iso?.[1]) return normalizeDateTime(iso[1])

  const human = chunk.match(/\b([A-Z][a-z]{2,8}\s+\d{1,2},\s*20\d{2}\s+\d{1,2}:\d{2}\s*(?:AM|PM)(?:\s*[A-Z]{2,5})?)\b/i)
  if (human?.[1]) return normalizeDateTime(human[1])

  return null
}

export function extractFromTrackingUrl(trackUrl: string): Partial<ExtractedTrackingFlightData> | null {
  const flightAwareMatch = trackUrl.match(
    /\/live\/flight\/([^/]+)\/history\/(\d{8})\/(\d{4})Z\/([A-Z]{3,4})\/([A-Z]{3,4})/i
  )
  if (flightAwareMatch) {
    const [, flightNoRaw, yyyymmdd, hhmm, dep, arr] = flightAwareMatch
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

  const flightStatsMatch = trackUrl.match(/\/v2\/flight-tracker\/([A-Z0-9]{2,3})\/(\d{1,4}[A-Z]?)/i)
  if (flightStatsMatch) {
    const [, carrierRaw, numberRaw] = flightStatsMatch
    const extracted: Partial<ExtractedTrackingFlightData> = {
      flightNumber: cleanFlightNumber(`${carrierRaw}${numberRaw}`),
    }

    try {
      const url = new URL(trackUrl)
      const year = Number.parseInt(url.searchParams.get('year') ?? '', 10)
      const month = Number.parseInt(url.searchParams.get('month') ?? '', 10)
      const day = Number.parseInt(url.searchParams.get('date') ?? '', 10)

      if (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        Number.isInteger(day) &&
        year >= 2000 &&
        year <= 2099 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        extracted.scheduledDepartureDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    } catch {
      // Ignore URL parse failures; path-derived flight number is still useful.
    }

    return extracted
  }

  const flighteraMatch = trackUrl.match(
    /\/flight_details\/[^/]+\/([A-Z0-9]{2,3}\d{1,4}[A-Z]?)\/([A-Z]{3,4})\/(\d{4}-\d{2}-\d{2})(?:\/([A-Z]{3,4}))?/i
  )
  if (flighteraMatch) {
    const [, flightNoRaw, depRaw, dateRaw, arrRaw] = flighteraMatch
    return {
      flightNumber: cleanFlightNumber(flightNoRaw),
      departureIata: depRaw.toUpperCase(),
      arrivalIata: arrRaw?.toUpperCase(),
      scheduledDepartureDate: dateRaw,
    }
  }

  return null
}

function extractFromJsonLd(html: string): Partial<ExtractedTrackingFlightData> {
  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)

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

      const dep = typeof record.departureTime === 'string' ? normalizeDateTime(record.departureTime) : null
      const arr = typeof record.arrivalTime === 'string' ? normalizeDateTime(record.arrivalTime) : null

      return {
        airline: typeof airlineObj?.name === 'string' ? airlineObj.name : undefined,
        flightNumber: typeof flightNumberRaw === 'string' ? cleanFlightNumber(flightNumberRaw) : undefined,
        departureIata: typeof depAirport?.iataCode === 'string' ? depAirport.iataCode.toUpperCase() : undefined,
        arrivalIata: typeof arrAirport?.iataCode === 'string' ? arrAirport.iataCode.toUpperCase() : undefined,
        scheduledDepartureDate: dep?.date,
        scheduledDepartureTime: dep?.time,
        scheduledArrivalDate: arr?.date,
        scheduledArrivalTime: arr?.time,
        timesInUtc: dep?.timesInUtc || arr?.timesInUtc || undefined,
      }
    }
  }

  return {}
}

function extractAirlineImageFromHtml(html: string, baseUrl?: string): string | undefined {
  if (baseUrl) {
    try {
      const host = new URL(baseUrl).hostname.toLowerCase()
      if (host.includes('flightstats.com')) {
        return undefined
      }
    } catch {
      // Ignore malformed baseUrl and continue best-effort extraction.
    }
  }

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

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
  if (ogImage?.[1]) return ogImage[1]

  return undefined
}

function extractFromFlightStatsState(html: string): Partial<ExtractedTrackingFlightData> {
  const stateMatch =
    html.match(/window\.__data\s*=\s*([\s\S]*?)<\/script>/i) ??
    html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/i)
  if (!stateMatch?.[1]) return {}

  const rawState = stateMatch[1].trim().replace(/;\s*$/, '')

  let parsed: unknown
  try {
    parsed = JSON.parse(rawState)
  } catch {
    return {}
  }

  const root = parsed as {
    SingleFlightTracker?: {
      extendedData?: {
        carrier?: { name?: string; fs?: string; flightNumber?: string; icao?: string }
        departureAirport?: {
          fs?: string
          iata?: string
          icao?: string
          date?: string
        }
        arrivalAirport?: {
          fs?: string
          iata?: string
          icao?: string
          date?: string
        }
        schedule?: {
          scheduledGateDeparture?: string
          scheduledGateArrival?: string
        }
        additionalFlightInfo?: {
          equipment?: { iata?: string; name?: string }
        }
      }
    }
  }

  const extended = root.SingleFlightTracker?.extendedData
  if (!extended) return {}

  const scheduledDeparture = extended.schedule?.scheduledGateDeparture ?? extended.departureAirport?.date
  const scheduledArrival = extended.schedule?.scheduledGateArrival ?? extended.arrivalAirport?.date
  const dep = scheduledDeparture ? normalizeDateTime(scheduledDeparture) : null
  const arr = scheduledArrival ? normalizeDateTime(scheduledArrival) : null

  const carrierCode = extended.carrier?.fs
  const flightNumberPart = extended.carrier?.flightNumber

  return {
    airline: extended.carrier?.name,
    flightNumber: carrierCode && flightNumberPart ? cleanFlightNumber(`${carrierCode}${flightNumberPart}`) : undefined,
    departureIata: extended.departureAirport?.fs ?? extended.departureAirport?.iata,
    arrivalIata: extended.arrivalAirport?.fs ?? extended.arrivalAirport?.iata,
    scheduledDepartureDate: dep?.date,
    scheduledDepartureTime: dep?.time,
    scheduledArrivalDate: arr?.date,
    scheduledArrivalTime: arr?.time,
    timesInUtc: false,
    aircraft:
      extended.additionalFlightInfo?.equipment?.iata ??
      normalizeAircraft(extended.additionalFlightInfo?.equipment?.name ?? ''),
  }
}

function extractWithRegex(text: string): Partial<ExtractedTrackingFlightData> {
  const uppercaseText = text.toUpperCase()
  const extracted: Partial<ExtractedTrackingFlightData> = {}

  const scheduledDep = extractDateTimeNearLabel(text, /\b(SCHEDULED|FILED)\s+DEPART(?:URE)?\b/i)
  const scheduledArr = extractDateTimeNearLabel(text, /\b(SCHEDULED|FILED)\s+ARRIV(?:AL)?\b/i)
  const actualDep = extractDateTimeNearLabel(text, /\bACTUAL\s+DEPART(?:URE)?\b/i)
  const actualArr = extractDateTimeNearLabel(text, /\bACTUAL\s+ARRIV(?:AL)?\b/i)
  const estimatedDep = extractDateTimeNearLabel(text, /\bESTIMAT(?:ED|E)\s+DEPART(?:URE)?\b/i)
  const estimatedArr = extractDateTimeNearLabel(text, /\bESTIMAT(?:ED|E)\s+ARRIV(?:AL)?\b/i)

  if (scheduledDep) {
    extracted.scheduledDepartureDate = scheduledDep.date
    extracted.scheduledDepartureTime = scheduledDep.time
    extracted.timesInUtc = extracted.timesInUtc || scheduledDep.timesInUtc
  }
  if (scheduledArr) {
    extracted.scheduledArrivalDate = scheduledArr.date
    extracted.scheduledArrivalTime = scheduledArr.time
    extracted.timesInUtc = extracted.timesInUtc || scheduledArr.timesInUtc
  }
  if (actualDep) {
    extracted.actualDepartureDate = actualDep.date
    extracted.actualDepartureTime = actualDep.time
    extracted.timesInUtc = extracted.timesInUtc || actualDep.timesInUtc
  }
  if (actualArr) {
    extracted.actualArrivalDate = actualArr.date
    extracted.actualArrivalTime = actualArr.time
    extracted.timesInUtc = extracted.timesInUtc || actualArr.timesInUtc
  }
  if (!actualDep && estimatedDep) {
    extracted.actualDepartureDate = estimatedDep.date
    extracted.actualDepartureTime = estimatedDep.time
    extracted.timesInUtc = extracted.timesInUtc || estimatedDep.timesInUtc
  }
  if (!actualArr && estimatedArr) {
    extracted.actualArrivalDate = estimatedArr.date
    extracted.actualArrivalTime = estimatedArr.time
    extracted.timesInUtc = extracted.timesInUtc || estimatedArr.timesInUtc
  }

  // FlightStats pages often expose airline name in a title/header pattern like:
  // "(OZ) Asiana Airlines 748 Flight Details"
  const flightStatsAirlineMatch =
    text.match(/\(([A-Z0-9]{2,3})\)\s+([A-Z][A-Za-z0-9&'.\-\s]{2,}?)\s+\d{1,4}[A-Z]?\s+FLIGHT\s+DETAILS/i) ??
    text.match(/([A-Z][A-Za-z0-9&'.\-\s]{2,}?)\s+\(([A-Z0-9]{2,3})\)\s+\d{1,4}[A-Z]?\s+FLIGHT\s+DETAILS/i)
  if (flightStatsAirlineMatch) {
    const candidate =
      flightStatsAirlineMatch[2]?.length > flightStatsAirlineMatch[1]?.length
        ? flightStatsAirlineMatch[2]
        : flightStatsAirlineMatch[1]
    if (candidate) {
      extracted.airline = candidate.replace(/\s+/g, ' ').trim()
    }
  }

  // Flight number must start with a 2-letter airline code (e.g. KE, AA, OZ)
  // to avoid matching stray years like "2026" or short numbers
  const flightNumberMatch = uppercaseText.match(/\b([A-Z]{2}\d{1,4}[A-Z]?)\b/)
  if (flightNumberMatch?.[1]) {
    extracted.flightNumber = cleanFlightNumber(flightNumberMatch[1])
  }

  // Exclude common HTML tag names that would otherwise look like IATA codes
  const HTML_KEYWORDS = new Set([
    'HTML',
    'HEAD',
    'BODY',
    'TEXT',
    'SPAN',
    'HREF',
    'TYPE',
    'META',
    'LINK',
    'FORM',
    'MAIN',
    'NONE',
    'AUTO',
    'NEXT',
    'PREV',
    'MORE',
    'OPEN',
    'TRUE',
    'NULL',
    'VOID',
  ])
  // Restrict fallback route regex to IATA-style 3-letter codes to avoid false positives like PLAY/APP.
  const routeMatch = uppercaseText.match(/\b([A-Z]{3})\s*(?:\/|->|→|-| TO )\s*([A-Z]{3})\b/)
  if (routeMatch?.[1] && routeMatch?.[2] && !HTML_KEYWORDS.has(routeMatch[1]) && !HTML_KEYWORDS.has(routeMatch[2])) {
    extracted.departureIata = routeMatch[1]
    extracted.arrivalIata = routeMatch[2]
  }

  const isoDateMatches = [...text.matchAll(/\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/g)]
  if (isoDateMatches[0]?.[1]) {
    const dep = normalizeDateTime(isoDateMatches[0][1])
    extracted.scheduledDepartureDate = extracted.scheduledDepartureDate ?? dep?.date
    extracted.scheduledDepartureTime = extracted.scheduledDepartureTime ?? dep?.time
    extracted.timesInUtc = extracted.timesInUtc || dep?.timesInUtc
  }
  if (isoDateMatches[1]?.[1]) {
    const arr = normalizeDateTime(isoDateMatches[1][1])
    extracted.scheduledArrivalDate = extracted.scheduledArrivalDate ?? arr?.date
    extracted.scheduledArrivalTime = extracted.scheduledArrivalTime ?? arr?.time
    extracted.timesInUtc = extracted.timesInUtc || arr?.timesInUtc
  }

  const aircraftMatch = uppercaseText.match(AIRCRAFT_PATTERN)
  if (aircraftMatch?.[1]) {
    extracted.aircraft = normalizeAircraft(aircraftMatch[1])
  }

  return extracted
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/json,text/plain,*/*',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.text()
  } finally {
    clearTimeout(timer)
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
    timesInUtc: primary.timesInUtc ?? fallback.timesInUtc,
    aircraft: primary.aircraft ?? fallback.aircraft,
  }
}

export function extractTrackingFlightDataFromHtml(
  html: string,
  options?: { baseUrl?: string }
): Partial<ExtractedTrackingFlightData> | null {
  const fromFlightStatsState = extractFromFlightStatsState(html)
  const fromJsonLd = extractFromJsonLd(html)
  const fromRegex = extractWithRegex(html)
  const airlineImage = extractAirlineImageFromHtml(html, options?.baseUrl)
  const merged = mergeExtracted(mergeExtracted(fromFlightStatsState, fromJsonLd, airlineImage), fromRegex, airlineImage)
  const hasAnyValue = Object.values(merged).some(Boolean)
  return hasAnyValue ? merged : null
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime())
}

function normalizeFlightCode(value: string): string | null {
  const split = splitFlightCode(value)
  if (!split) return null
  return `${split.carrier}${split.number}`
}

const IATA_TO_ICAO_AIRLINE_CODE: Record<string, string> = {
  AA: 'AAL',
  AC: 'ACA',
  AF: 'AFR',
  AS: 'ASA',
  BA: 'BAW',
  B6: 'JBU',
  CX: 'CPA',
  DL: 'DAL',
  EK: 'UAE',
  EY: 'ETD',
  IB: 'IBE',
  JL: 'JAL',
  KE: 'KAL',
  KL: 'KLM',
  LH: 'DLH',
  NH: 'ANA',
  OZ: 'AAR',
  QF: 'QFA',
  QR: 'QTR',
  SQ: 'SIA',
  TK: 'THY',
  UA: 'UAL',
  WN: 'SWA',
}

function expandFlightCodeVariants(flightCode: string): string[] {
  const match = flightCode.match(/^([A-Z0-9]{2,3})(\d{1,4}[A-Z]?)$/)
  if (!match) return [flightCode]

  const [, carrier, number] = match
  const variants = new Set<string>()

  if (carrier.length === 2 && IATA_TO_ICAO_AIRLINE_CODE[carrier]) {
    variants.add(`${IATA_TO_ICAO_AIRLINE_CODE[carrier]}${number}`)
  }
  variants.add(flightCode)

  return [...variants]
}

function buildProviderUrls(flightCode: string, date: string): string[] {
  const split = splitFlightCode(flightCode)
  const carrier = split?.carrier
  const number = split?.number
  const [year, monthRaw, dayRaw] = date.split('-')
  const month = String(Number.parseInt(monthRaw, 10))
  const day = String(Number.parseInt(dayRaw, 10))
  const variants = expandFlightCodeVariants(flightCode)
  const urls = new Set<string>()

  if (carrier && number) {
    // Primary flight-code lookup source.
    urls.add(
      `https://www.flightstats.com/v2/flight-details/${carrier}/${number}?year=${year}&month=${month}&date=${day}`
    )
    urls.add(`https://www.flightstats.com/v2/flight-details/${carrier}/${number}`)
    urls.add(`https://www.flightera.net/en/flight/${flightCode}/${date}`)
  }

  for (const variant of variants) {
    // FlightAware commonly indexes by ICAO callsign (e.g. AAR748), not IATA (e.g. OZ748).
    urls.add(`https://www.flightaware.com/live/flight/${variant}`)
  }

  return [...urls]
}

async function extractFromSourceUrl(sourceUrl: string): Promise<Partial<ExtractedTrackingFlightData> | null> {
  let lastError: unknown
  try {
    const text = await fetchText(sourceUrl)
    const fromHtml = extractTrackingFlightDataFromHtml(text, { baseUrl: sourceUrl })
    const fromUrl = extractFromTrackingUrl(sourceUrl)
    if (!fromHtml && !fromUrl) return null
    return fromHtml
      ? {
          ...fromUrl,
          ...fromHtml,
          departureIata: fromHtml.departureIata ?? fromUrl?.departureIata,
          arrivalIata: fromHtml.arrivalIata ?? fromUrl?.arrivalIata,
          flightNumber: fromHtml.flightNumber ?? fromUrl?.flightNumber,
          scheduledDepartureDate: fromHtml.scheduledDepartureDate ?? fromUrl?.scheduledDepartureDate,
          scheduledDepartureTime: fromHtml.scheduledDepartureTime ?? fromUrl?.scheduledDepartureTime,
          timesInUtc: fromHtml.timesInUtc ?? fromUrl?.timesInUtc,
        }
      : fromUrl
  } catch (err) {
    lastError = err
  }

  const fromUrl = extractFromTrackingUrl(sourceUrl)
  if (fromUrl) return fromUrl
  if (lastError) throw lastError
  return null
}

export function isLowConfidenceFlightCodeResult(
  extracted: Partial<ExtractedTrackingFlightData>,
  providerUrl: string
): boolean {
  try {
    const host = new URL(providerUrl).hostname.toLowerCase()
    if (!host.includes('flightaware.com')) return false
  } catch {
    return false
  }

  // FlightAware live/history URL parsing can provide only a departure UTC timestamp from the path.
  // For flight-code lookup we should not trust that partial fallback as final schedule data.
  return Boolean(
    extracted.departureIata &&
    extracted.arrivalIata &&
    extracted.scheduledDepartureDate &&
    extracted.scheduledDepartureTime &&
    !extracted.scheduledArrivalDate &&
    !extracted.scheduledArrivalTime &&
    !extracted.actualDepartureTime &&
    !extracted.actualArrivalTime &&
    !extracted.airline
  )
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    try {
      const body = (await request.json()) as { url?: string; flightCode?: string; date?: string }
      const trackUrl = typeof body.url === 'string' ? body.url.trim() : ''
      const flightCodeInput = typeof body.flightCode === 'string' ? body.flightCode.trim() : ''

      if (trackUrl) {
        const extracted = await extractFromSourceUrl(trackUrl)
        if (!extracted) {
          return new Response(JSON.stringify({ error: 'Could not extract tracking data' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({
            data: {
              ...extracted,
              sourceUrl: trackUrl,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (flightCodeInput) {
        const normalizedFlightCode = normalizeFlightCode(flightCodeInput)
        if (!normalizedFlightCode) {
          return new Response(JSON.stringify({ error: 'Invalid "flightCode" format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const requestedDate =
          typeof body.date === 'string' && isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10)
        const providerUrls = buildProviderUrls(normalizedFlightCode, requestedDate)

        let lastError: unknown
        for (const providerUrl of providerUrls) {
          try {
            const extracted = await extractFromSourceUrl(providerUrl)
            if (!extracted) continue
            if (isLowConfidenceFlightCodeResult(extracted, providerUrl)) continue
            return new Response(
              JSON.stringify({
                data: {
                  flightNumber: extracted.flightNumber ?? normalizedFlightCode,
                  scheduledDepartureDate: extracted.scheduledDepartureDate ?? requestedDate,
                  ...extracted,
                  sourceUrl: providerUrl,
                },
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } catch (err) {
            lastError = err
          }
        }

        if (lastError) {
          console.error('Flight code lookup failed across providers', {
            flightCode: normalizedFlightCode,
            error: lastError,
          })
        }

        return new Response(
          JSON.stringify({
            data: {
              flightNumber: normalizedFlightCode,
              scheduledDepartureDate: requestedDate,
              sourceUrl: providerUrls[0],
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(JSON.stringify({ error: 'Missing "url" or "flightCode" in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  },
}
