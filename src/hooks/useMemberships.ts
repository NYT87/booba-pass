import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Membership } from '../types'

export function useMemberships() {
  return useLiveQuery(() => db.memberships.toArray())
}

export function useMembershipById(id: number | undefined) {
  return useLiveQuery(() => (id !== undefined ? db.memberships.get(id) : undefined), [id])
}

export async function saveMembership(membership: Omit<Membership, 'id'> & { id?: number }) {
  if (membership.id !== undefined) {
    await db.memberships.put(membership as Membership)
    return membership.id
  }
  return db.memberships.add(membership as Membership)
}

export async function deleteMembership(id: number) {
  await db.memberships.delete(id)
}
