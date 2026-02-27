import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

function normalizeAirlineName(name: string) {
  return name.trim().toUpperCase()
}

export function useAirlineByName(name: string | undefined) {
  return useLiveQuery(async () => {
    if (!name?.trim()) return undefined
    const normalized = normalizeAirlineName(name)
    const all = await db.airlines.toArray()
    return all.find((a) => normalizeAirlineName(a.name) === normalized)
  }, [name])
}

export async function saveAirlineLogo(name: string, image: string) {
  const normalized = normalizeAirlineName(name)
  if (!normalized || !image) return

  const all = await db.airlines.toArray()
  const existing = all.find((a) => normalizeAirlineName(a.name) === normalized)
  if (existing?.id !== undefined) {
    await db.airlines.update(existing.id, { name: normalized, image })
    return existing.id
  }
  return db.airlines.add({ name: normalized, image })
}
