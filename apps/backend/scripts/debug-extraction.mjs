#!/usr/bin/env node
/**
 * Debug script for the tracking extraction logic.
 * Runs entirely in Node.js (outside the Worker sandbox), so you can:
 *   - See full console output
 *   - Save the raw HTML to a file for inspection
 *
 * Usage:
 *   node scripts/debug-extraction.mjs <url> [--save]
 *
 * Examples:
 *   node scripts/debug-extraction.mjs "https://www.flightaware.com/live/flight/AAR742/history/20260216/1705Z/VTBS/RKSI"
 *   node scripts/debug-extraction.mjs "https://www.flightaware.com/live/flight/AAR742/history/20260216/1705Z/VTBS/RKSI" --save
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.argv[2]
const shouldSave = process.argv.includes('--save')

if (!url) {
  console.error('Usage: node scripts/debug-extraction.mjs <url> [--save]')
  process.exit(1)
}

// --- Inline the pure parsing functions from the Worker ---
// (duplicated here so we don't need to transpile TS in Node)

const AIRCRAFT_PATTERN =
  /\b(AIRBUS\s*A\d{3}(?:-\d{3})?|BOEING\s*7\d{2}(?:-\d{3})?|A\d{3}(?:-\d{3})?|B7\d{2}(?:-\d{3})?)\b/i

function normalizeDateTime(dateTime) {
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  }
}

function cleanFlightNumber(value) {
  return value.toUpperCase().replace(/\s+/g, '')
}

function extractDateTimeNearLabel(source, labelPattern) {
  const labelMatch = source.match(labelPattern)
  if (!labelMatch || labelMatch.index === undefined) return null
  const chunk = source.slice(labelMatch.index, labelMatch.index + 260)
  const iso = chunk.match(/\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/i)
  if (iso?.[1]) return normalizeDateTime(iso[1])
  const human = chunk.match(/\b([A-Z][a-z]{2,8}\s+\d{1,2},\s*20\d{2}\s+\d{1,2}:\d{2}\s*(?:AM|PM)(?:\s*[A-Z]{2,5})?)\b/i)
  if (human?.[1]) return normalizeDateTime(human[1])
  return null
}

function extractFromTrackingUrl(trackUrl) {
  const match = trackUrl.match(/\/live\/flight\/([^/]+)\/history\/(\d{8})\/(\d{4})Z\/([A-Z]{3,4})\/([A-Z]{3,4})/i)
  if (!match) return null
  const [, flightNoRaw, yyyymmdd, hhmm, dep, arr] = match
  return {
    flightNumber: cleanFlightNumber(flightNoRaw),
    departureIata: dep.toUpperCase(),
    arrivalIata: arr.toUpperCase(),
    scheduledDepartureDate: `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`,
    scheduledDepartureTime: `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`,
    timesInUtc: true,
  }
}

function extractFromJsonLd(html) {
  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of scriptMatches) {
    const rawJson = match[1]?.trim()
    if (!rawJson) continue
    let parsed
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      continue
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed]
    for (const node of nodes) {
      const type = String(node['@type'] ?? '').toLowerCase()
      if (!type.includes('flight')) continue
      const dep = typeof node.departureTime === 'string' ? normalizeDateTime(node.departureTime) : null
      const arr = typeof node.arrivalTime === 'string' ? normalizeDateTime(node.arrivalTime) : null
      const airlineObj = node.airline
      const depAirport = node.departureAirport
      const arrAirport = node.arrivalAirport
      const flightNumberRaw = node.flightNumber ?? node.identifier
      return {
        airline: typeof airlineObj?.name === 'string' ? airlineObj.name : undefined,
        flightNumber: typeof flightNumberRaw === 'string' ? cleanFlightNumber(flightNumberRaw) : undefined,
        departureIata: typeof depAirport?.iataCode === 'string' ? depAirport.iataCode.toUpperCase() : undefined,
        arrivalIata: typeof arrAirport?.iataCode === 'string' ? arrAirport.iataCode.toUpperCase() : undefined,
        scheduledDepartureDate: dep?.date,
        scheduledDepartureTime: dep?.time,
        scheduledArrivalDate: arr?.date,
        scheduledArrivalTime: arr?.time,
      }
    }
  }
  return {}
}

function extractWithRegex(text) {
  const uppercaseText = text.toUpperCase()
  const extracted = {}

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

  const flightNumberMatch = uppercaseText.match(/\b([A-Z]{2}\d{1,4}[A-Z]?)\b/)
  if (flightNumberMatch?.[1]) extracted.flightNumber = cleanFlightNumber(flightNumberMatch[1])

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
  const routeMatch = uppercaseText.match(/\b([A-Z]{3,4})\s*(?:\/|->|→|-| TO )\s*([A-Z]{3,4})\b/)
  if (routeMatch?.[1] && routeMatch?.[2] && !HTML_KEYWORDS.has(routeMatch[1]) && !HTML_KEYWORDS.has(routeMatch[2])) {
    extracted.departureIata = routeMatch[1]
    extracted.arrivalIata = routeMatch[2]
  }

  const isoDateMatches = [...text.matchAll(/\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/g)]
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
  if (aircraftMatch?.[1]) extracted.aircraft = aircraftMatch[1].replace(/\s+/g, ' ').trim()

  return extracted
}

// --- Main ---

console.log(`\n🔍 Fetching: ${url}\n`)

const controller = new AbortController()
setTimeout(() => controller.abort(), 15000)

const response = await fetch(url, {
  signal: controller.signal,
  headers: {
    Accept: 'text/html,*/*',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  },
})

if (!response.ok) {
  console.error(`❌ HTTP ${response.status}`)
  process.exit(1)
}

const html = await response.text()
console.log(`📄 HTML size: ${(html.length / 1024).toFixed(1)} KB`)

if (shouldSave) {
  const outPath = resolve(__dirname, '../debug-output.html')
  writeFileSync(outPath, html, 'utf-8')
  console.log(`💾 HTML saved to: ${outPath}\n`)
}

const fromUrl = extractFromTrackingUrl(url)
const fromJsonLd = extractFromJsonLd(html)
const fromRegex = extractWithRegex(html)

const merged = {
  ...fromUrl,
  ...fromJsonLd,
  ...fromRegex,
  departureIata: (fromJsonLd.departureIata ?? fromRegex.departureIata) || fromUrl?.departureIata,
  arrivalIata: (fromJsonLd.arrivalIata ?? fromRegex.arrivalIata) || fromUrl?.arrivalIata,
  flightNumber: (fromJsonLd.flightNumber ?? fromRegex.flightNumber) || fromUrl?.flightNumber,
  scheduledDepartureDate:
    (fromJsonLd.scheduledDepartureDate ?? fromRegex.scheduledDepartureDate) || fromUrl?.scheduledDepartureDate,
  scheduledDepartureTime:
    (fromJsonLd.scheduledDepartureTime ?? fromRegex.scheduledDepartureTime) || fromUrl?.scheduledDepartureTime,
}

console.log('📎 From URL pattern:')
console.log(fromUrl ? JSON.stringify(fromUrl, null, 2) : '  (no match)')

console.log('\n📊 From JSON-LD:')
console.log(Object.keys(fromJsonLd).length ? JSON.stringify(fromJsonLd, null, 2) : '  (empty)')

console.log('\n🔎 From Regex:')
console.log(Object.keys(fromRegex).length ? JSON.stringify(fromRegex, null, 2) : '  (empty)')

console.log('\n✅ Final merged result:')
console.log(JSON.stringify({ ...merged, sourceUrl: url }, null, 2))
