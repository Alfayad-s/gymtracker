import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserSyncPayload, saveUserSyncPayload } from '@/lib/sync/server'
import type { UserSyncPayload } from '@/lib/sync/types'
import { SYNC_VERSION } from '@/lib/sync/types'

function isValidPayload(body: unknown): body is UserSyncPayload {
  if (!body || typeof body !== 'object') return false
  const payload = body as UserSyncPayload
  return payload.version === SYNC_VERSION && Boolean(payload.stores)
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getUserSyncPayload(user.id)
    return NextResponse.json({ payload })
  } catch (err) {
    console.error('Sync GET failed:', err)
    return NextResponse.json({ error: 'Sync unavailable' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Invalid sync payload' }, { status: 400 })
  }

  try {
    const merged = await saveUserSyncPayload(user.id, body)
    return NextResponse.json({ payload: merged })
  } catch (err) {
    console.error('Sync POST failed:', err)
    return NextResponse.json({ error: 'Sync unavailable' }, { status: 503 })
  }
}
