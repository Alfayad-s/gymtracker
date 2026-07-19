import { NextResponse } from 'next/server'
import { fetchVisualCrossingCurrent } from '@/lib/weather/visualcrossing'

export const runtime = 'nodejs'

function parseCoord(value: string | null): number | null {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function weatherApiKey(): string | undefined {
  return (
    process.env.VISUAL_CROSSING_API_KEY?.trim() ||
    process.env.VISUALCROSSING_API_KEY?.trim()
  )
}

/** Current weather for lat/lon via Visual Crossing (API key stays server-side). */
export async function GET(request: Request) {
  const apiKey = weatherApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Weather is not configured (VISUAL_CROSSING_API_KEY)' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const lat = parseCoord(searchParams.get('lat'))
  const lon = parseCoord(searchParams.get('lon'))

  if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: 'Location required', code: 'location_required' },
      { status: 400 }
    )
  }

  try {
    const weather = await fetchVisualCrossingCurrent({
      location: `${lat},${lon}`,
      apiKey,
    })
    return NextResponse.json(weather, {
      headers: { 'Cache-Control': 'private, max-age=600' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch weather'
    console.error('[weather]', error)

    if (/401|403|Invalid|unauthorized|API key/i.test(message)) {
      return NextResponse.json(
        {
          error:
            'Visual Crossing rejected the API key. Set VISUAL_CROSSING_API_KEY from https://www.visualcrossing.com/ then restart `npm run dev`.',
          code: 'invalid_api_key',
        },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
