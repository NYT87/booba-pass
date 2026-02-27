import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/airports.json')

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

// OpenFlights Airports data includes timezones
const csv = await fetch(
  'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat'
)
const lines = csv.split('\n')
// header: id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,icao_code,iata_code,...
const airports = []
for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  if (!line.trim()) continue
  // Simple CSV parse (fields may be quoted)
  const fields = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') {
      inQ = !inQ
      continue
    }
    if (ch === ',' && !inQ) {
      fields.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  fields.push(cur)

  // OpenFlights format: id, name, city, country, iata, icao, lat, lon, alt, tz_offset, dst, tz_name, ...
  const iata = fields[4]
  if (!iata || iata === '\\N' || iata.length !== 3) continue

  const lat = parseFloat(fields[6])
  const lon = parseFloat(fields[7])
  const timezone = fields[11] // e.g. "America/New_York"
  if (isNaN(lat) || isNaN(lon)) continue

  airports.push({
    iata,
    name: fields[1],
    city: fields[2],
    country: fields[3],
    lat,
    lon,
    timezone: timezone !== '\\N' && timezone ? timezone : undefined,
  })
}

airports.sort((a, b) => a.iata.localeCompare(b.iata))
fs.writeFileSync(OUT, JSON.stringify(airports))
console.log(`Written ${airports.length} airports to ${OUT}`)
