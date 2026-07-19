export type WeatherCondition =
  | 'Clear'
  | 'Cloudy'
  | 'Rainy'
  | 'Drizzle'
  | 'Stormy'
  | 'Snowy'
  | 'Foggy'
  | 'Windy'
  | 'Hazy'

export type WeatherSnapshot = {
  label: WeatherCondition
  description: string
  tempC: number
  iconCode: string
  city: string | null
  fetchedAt: string
}

/** Map Visual Crossing icon / conditions text → short UI label. */
export function labelFromVisualCrossing(icon: string, conditions: string): WeatherCondition {
  const i = icon.trim().toLowerCase()
  const c = conditions.trim().toLowerCase()

  if (i.includes('thunder') || c.includes('thunder') || c.includes('storm')) return 'Stormy'
  if (i.includes('snow') || c.includes('snow') || c.includes('blizzard')) return 'Snowy'
  if (i.includes('fog') || c.includes('fog') || c.includes('mist')) return 'Foggy'
  if (i.includes('haze') || c.includes('haze') || c.includes('smoke') || c.includes('dust'))
    return 'Hazy'
  if (i === 'wind' || c.includes('wind')) return 'Windy'
  if (i.includes('drizzle') || c.includes('drizzle') || c.includes('sprinkle')) return 'Drizzle'
  if (i.includes('rain') || c.includes('rain') || c.includes('shower')) return 'Rainy'
  if (i.includes('clear') || c === 'clear' || c.includes('sunny')) return 'Clear'
  if (
    i.includes('cloud') ||
    c.includes('cloud') ||
    c.includes('overcast') ||
    c.includes('partly')
  ) {
    return 'Cloudy'
  }

  return 'Cloudy'
}

type VisualCrossingTimelineResponse = {
  resolvedAddress?: string
  address?: string
  timezone?: string
  currentConditions?: {
    temp?: number
    conditions?: string
    icon?: string
  }
  days?: Array<{
    temp?: number
    conditions?: string
    icon?: string
  }>
}

/**
 * Current weather via Visual Crossing Timeline API.
 * `location` can be "lat,lon" or a place name like "London,UK".
 * @see https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
 */
export async function fetchVisualCrossingCurrent(opts: {
  location: string
  apiKey: string
}): Promise<WeatherSnapshot> {
  const location = opts.location.trim()
  if (!location) throw new Error('Location is required')

  const url = new URL(
    `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}`
  )
  url.searchParams.set('unitGroup', 'metric')
  url.searchParams.set('include', 'current')
  url.searchParams.set('contentType', 'json')
  url.searchParams.set('key', opts.apiKey)

  const res = await fetch(url.toString(), {
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Visual Crossing ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`)
  }

  const data = (await res.json()) as VisualCrossingTimelineResponse
  const current = data.currentConditions
  const fallback = data.days?.[0]
  const conditions = current?.conditions ?? fallback?.conditions ?? 'Cloudy'
  const icon = current?.icon ?? fallback?.icon ?? 'cloudy'
  const temp = typeof current?.temp === 'number' ? current.temp : (fallback?.temp ?? 0)

  const city =
    data.resolvedAddress?.split(',')[0]?.trim() ||
    data.address?.split(',')[0]?.trim() ||
    null

  return {
    label: labelFromVisualCrossing(icon, conditions),
    description: conditions,
    tempC: Math.round(temp),
    iconCode: icon,
    city,
    fetchedAt: new Date().toISOString(),
  }
}
