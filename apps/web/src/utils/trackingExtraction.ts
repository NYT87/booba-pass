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
const PROXY_URL = import.meta.env.VITE_TRACKING_PROXY_URL || 'http://localhost:8787'

function extractFromTrackingUrl(trackUrl: string): Partial<ExtractedTrackingFlightData> | null {
  const match = trackUrl.match(/\/live\/flight\/([^/]+)\/history\/(\d{8})\/(\d{4})Z\/([A-Z]{3,4})\/([A-Z]{3,4})/i)
  if (!match) return null

  const [, flightNoRaw, yyyymmdd, hhmm, dep, arr] = match
  const date = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
  const time = `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`

  return {
    flightNumber: flightNoRaw.toUpperCase().replace(/\s+/g, ''),
    departureIata: dep.toUpperCase(),
    arrivalIata: arr.toUpperCase(),
    scheduledDepartureDate: date,
    scheduledDepartureTime: time,
    timesInUtc: true,
  }
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

    if (!response.ok) {
      throw new Error(`Proxy error: HTTP ${response.status}`)
    }

    const json = await response.json()
    if (json.data) {
      return json.data as ExtractedTrackingFlightData
    }

    if (json.error) {
      throw new Error(json.error)
    }

    return null
  } catch (err) {
    console.error('Failed to extract via proxy:', err)

    // Fallback: If proxy fails, try to extract metadata simply from the URL string itself
    const fromUrl = extractFromTrackingUrl(trackUrl)
    if (fromUrl) {
      return {
        ...fromUrl,
        sourceUrl: trackUrl,
      } as ExtractedTrackingFlightData
    }

    throw err
  } finally {
    globalThis.clearTimeout(timer)
  }
}

export { extractFromTrackingUrl }
