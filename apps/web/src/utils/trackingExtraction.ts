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
const PROXY_URL = import.meta.env?.VITE_TRACKING_PROXY_URL || 'http://localhost:8787'

type ProxyEnvelope = {
  data?: unknown
  result?: unknown
  error?: unknown
}

function normalizeFlightCode(value: string): string | null {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2,3}|[A-Z]\d)\s*[- ]?\s*(\d{1,4}[A-Z]?)$/)
  if (!match) return null
  return `${match[1]}${match[2]}`
}

function parseProxySuccessBody(
  response: Response,
  rawBody: string,
  sourceFallback: string
): ExtractedTrackingFlightData | null {
  let envelope: ProxyEnvelope | null = null

  if (rawBody.trim()) {
    try {
      envelope = JSON.parse(rawBody) as ProxyEnvelope
    } catch {
      envelope = null
    }
  }

  if (!response.ok) {
    const proxyMessage = typeof envelope?.error === 'string' ? envelope.error : rawBody.slice(0, 120).trim()
    throw new Error(proxyMessage || `Proxy error: HTTP ${response.status}`)
  }

  const dataCandidate =
    (envelope?.data as ExtractedTrackingFlightData | undefined) ??
    (envelope?.result as ExtractedTrackingFlightData | undefined)

  if (dataCandidate && typeof dataCandidate === 'object') {
    return {
      ...dataCandidate,
      sourceUrl: dataCandidate.sourceUrl || sourceFallback,
    }
  }

  if (envelope && typeof envelope === 'object' && !('error' in envelope)) {
    return {
      ...(envelope as ExtractedTrackingFlightData),
      sourceUrl: (envelope as ExtractedTrackingFlightData).sourceUrl || sourceFallback,
    }
  }

  return null
}

export async function fetchAndExtractTrackingFlightData(trackUrl: string): Promise<ExtractedTrackingFlightData | null> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: trackUrl }),
      signal: controller.signal,
    })
    const rawBody = await response.text()
    return parseProxySuccessBody(response, rawBody, trackUrl)
  } catch (err) {
    console.error('Failed to extract via proxy:', err)
    throw err
  } finally {
    globalThis.clearTimeout(timer)
  }
}

export async function fetchAndExtractTrackingFlightDataByCode(
  flightCode: string,
  date?: string
): Promise<ExtractedTrackingFlightData | null> {
  const normalized = normalizeFlightCode(flightCode)
  if (!normalized) {
    throw new Error('Invalid flight code format')
  }

  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), 15000)
  const sourceFallback = `flight-code:${normalized}`

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flightCode: normalized, date }),
      signal: controller.signal,
    })

    const rawBody = await response.text()
    return parseProxySuccessBody(response, rawBody, sourceFallback)
  } catch (err) {
    console.error('Failed to extract via flight code proxy:', err)

    return {
      flightNumber: normalized,
      scheduledDepartureDate: date,
      sourceUrl: sourceFallback,
    }
  } finally {
    globalThis.clearTimeout(timer)
  }
}
