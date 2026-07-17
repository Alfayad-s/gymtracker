import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { userAppSync } from '@/db/schema'
import {
  mergePayloads,
  type UserSyncPayload,
  SYNC_VERSION,
} from '@/lib/sync/types'

function parsePayload(raw: string | null | undefined): UserSyncPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as UserSyncPayload
    if (parsed?.version !== SYNC_VERSION || !parsed.stores) return null
    return parsed
  } catch {
    return null
  }
}

export async function getUserSyncPayload(userId: string): Promise<UserSyncPayload | null> {
  const row = await db.query.userAppSync.findFirst({
    where: eq(userAppSync.userId, userId),
  })
  return parsePayload(row?.payload)
}

export async function saveUserSyncPayload(
  userId: string,
  incoming: UserSyncPayload
): Promise<UserSyncPayload> {
  const existing = await getUserSyncPayload(userId)
  const merged = mergePayloads(existing, incoming)

  await db
    .insert(userAppSync)
    .values({
      userId,
      payload: JSON.stringify(merged),
    })
    .onConflictDoUpdate({
      target: userAppSync.userId,
      set: {
        payload: JSON.stringify(merged),
        updatedAt: new Date(),
      },
    })

  return merged
}

export { mergePayloads }
