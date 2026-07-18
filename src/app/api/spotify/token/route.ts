import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getValidAccessToken, getConnectionRow } from '@/lib/spotify/client'

export const runtime = 'nodejs'

/** Short-lived access token for Web Playback SDK (Premium only). */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const row = await getConnectionRow(user.id)
    if (!row) {
      return NextResponse.json({ error: 'Not connected' }, { status: 404 })
    }
    const product = (row.product ?? '').toLowerCase()
    if (product !== 'premium') {
      return NextResponse.json(
        { error: 'Spotify Premium required for in-app playback' },
        { status: 403 }
      )
    }
    const accessToken = await getValidAccessToken(user.id)
    return NextResponse.json({
      accessToken,
      expiresAt: row.tokenExpiresAt.toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token failed' },
      { status: 503 }
    )
  }
}
