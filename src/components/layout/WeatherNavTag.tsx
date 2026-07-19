'use client'

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { WeatherCondition, WeatherSnapshot } from '@/lib/weather/visualcrossing'
import { WEATHER_ICON_COLORS } from '@/lib/weather/styles'

const ICONS: Record<WeatherCondition, LucideIcon> = {
  Clear: Sun,
  Cloudy: Cloud,
  Rainy: CloudRain,
  Drizzle: CloudDrizzle,
  Stormy: CloudLightning,
  Snowy: CloudSnow,
  Foggy: CloudFog,
  Windy: Wind,
  Hazy: CloudFog,
}

type WeatherNavTagProps = {
  weather: WeatherSnapshot | null
}

export function WeatherNavTag({ weather }: WeatherNavTagProps) {
  if (!weather) return null

  const Icon = ICONS[weather.label] ?? Cloud
  const iconColor = WEATHER_ICON_COLORS[weather.label] ?? '#FFFFFF'

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-t-[12px] bg-black px-2.5 py-1.5 text-white"
      title={
        weather.city
          ? `${weather.description} · ${weather.tempC}°C · ${weather.city}`
          : `${weather.description} · ${weather.tempC}°C`
      }
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: iconColor }}
        strokeWidth={2.25}
        aria-hidden
      />
      <span className="text-[10px] font-semibold tracking-wide leading-none text-white">
        {weather.label}
      </span>
      <span className="text-[10px] font-medium text-white/70 leading-none tabular-nums">
        {weather.tempC}°
      </span>
    </div>
  )
}
