import { db } from '../db/db'

export interface AirlineCatalogEntry {
  iata: string
  icao?: string
  name: string
  alliance?: string
  logo?: string
}

export interface LoyaltyProgramEntry {
  airlineIata?: string
  airlineName: string
  programName: string
  alliance?: string
  logo?: string
}

let airlinesCache: AirlineCatalogEntry[] | null = null
let programsCache: LoyaltyProgramEntry[] | null = null

function normalize(value: string) {
  return value.trim().toUpperCase()
}

async function fetchCatalogJson<T>(path: string): Promise<T[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Failed to load catalog: ${path} (${response.status})`)
  }

  const json = (await response.json()) as unknown
  if (!Array.isArray(json)) return []
  return json as T[]
}

export async function loadAirlineCatalog(): Promise<AirlineCatalogEntry[]> {
  if (airlinesCache) return airlinesCache
  const raw = await fetchCatalogJson<AirlineCatalogEntry>('data/airline-catalog.json')
  airlinesCache = raw
    .filter((a) => Boolean(a?.name))
    .map((a) => ({
      ...a,
      iata: normalize(a.iata),
      icao: a.icao ? normalize(a.icao) : undefined,
      name: normalize(a.name),
      alliance: a.alliance ? normalize(a.alliance) : undefined,
    }))
  return airlinesCache
}

export async function loadLoyaltyProgramCatalog(): Promise<LoyaltyProgramEntry[]> {
  if (programsCache) return programsCache
  const raw = await fetchCatalogJson<LoyaltyProgramEntry>('data/loyalty-programs.json')
  programsCache = raw
    .filter((p) => Boolean(p?.airlineName) && Boolean(p?.programName))
    .map((p) => ({
      ...p,
      airlineIata: p.airlineIata ? normalize(p.airlineIata) : undefined,
      airlineName: normalize(p.airlineName),
      programName: normalize(p.programName),
      alliance: p.alliance ? normalize(p.alliance) : undefined,
    }))
  return programsCache
}

export async function findAirlineCatalogEntry(input: string): Promise<AirlineCatalogEntry | null> {
  const normalized = normalize(input)
  if (!normalized) return null

  const catalog = await loadAirlineCatalog()
  return catalog.find((a) => a.name === normalized || a.iata === normalized || a.icao === normalized) ?? null
}

export async function cacheAirlineFromInput(input: string): Promise<AirlineCatalogEntry | null> {
  const matched = await findAirlineCatalogEntry(input)
  if (!matched) return null

  const key = normalize(matched.name)
  const existing = await db.airlines.filter((a) => normalize(a.name) === key).first()
  if (existing?.image?.startsWith('data:')) return matched

  const imageToStore = matched.logo ?? ''

  if (!imageToStore) return matched
  if (existing?.id !== undefined) {
    await db.airlines.update(existing.id, { name: key, image: imageToStore })
  } else {
    await db.airlines.add({ name: key, image: imageToStore })
  }
  return matched
}

export function matchProgramsForAirline(programs: LoyaltyProgramEntry[], airlineInput: string): LoyaltyProgramEntry[] {
  const normalized = normalize(airlineInput)
  if (!normalized) return programs
  return programs.filter((p) => p.airlineName === normalized || p.airlineIata === normalized)
}
