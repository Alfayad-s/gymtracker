'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WeatherSnapshot } from '@/lib/weather/visualcrossing'

const CACHE_KEY = 'gymtrack.weather.vc.v3'
const CACHE_TTL_MS = 15 * 60 * 1000

type CachePayload = {
  weather: WeatherSnapshot
  savedAt: number
}

function readCache(): WeatherSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (!parsed?.weather?.label || !parsed.savedAt) return null
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null
    return parsed.weather
  } catch {
    return null
  }
}

function writeCache(weather: WeatherSnapshot) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ weather, savedAt: Date.now() }))
  } catch {
    // ignore
  }
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 6_000,
        maximumAge: 10 * 60 * 1000,
      }
    )
  })
}

/** Live weather for GPS location only — null when location is denied/unavailable. */
export function useWeather() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)

  const load = useCallback(async () => {
    const cached = readCache()
    if (cached) {
      setWeather(cached)
      return
    }

    try {
      const pos = await getPosition()
      if (!pos) return

      const res = await fetch(
        `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
      )
      if (!res.ok) return

      const data = (await res.json()) as WeatherSnapshot
      if (!data?.label) return

      setWeather(data)
      writeCache(data)
    } catch {
      // keep null
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return weather
}
