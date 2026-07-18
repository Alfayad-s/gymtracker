import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getConnectionRow, rowToPublic } from '@/lib/spotify/client'

export const runtime = 'nodejs'

/** REST fallback for connection status (clearer errors than server actions in prod). */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ connected: false as const, error: 'Unauthorized' }, { status: 401 })
    }

    const row = await getConnectionRow(user.id)
    if (!row) return NextResponse.json({ connected: false as const })
    return NextResponse.json(rowToPublic(row))
  } catch (error) {
    console.error('[spotify/connection]', error)
    return NextResponse.json(
      {
        connected: false as const,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load Spotify connection',
      },
      { status: 500 }
    )
  }
}
