import { fetchAndExtractTrackingFlightData } from '../src/utils/trackingExtraction.ts'

const url = process.argv[2] || 'https://www.flightaware.com/live/flight/NOK531/history/20260212/1130Z/VTSP/VTBD'

try {
  const extracted = await fetchAndExtractTrackingFlightData(url)
  console.log(JSON.stringify({ url, extracted }, null, 2))
} catch (error) {
  console.error('Failed to extract tracking data:', error)
  process.exit(1)
}
