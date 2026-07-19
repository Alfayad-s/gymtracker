import type { WeatherCondition } from '@/lib/weather/visualcrossing'

/** Per-state icon colors for the weather tag. */
export const WEATHER_ICON_COLORS: Record<WeatherCondition, string> = {
  Clear: '#FBBF24', // amber / sun
  Cloudy: '#94A3B8', // slate
  Rainy: '#38BDF8', // sky blue
  Drizzle: '#22D3EE', // cyan
  Stormy: '#A78BFA', // violet
  Snowy: '#E0F2FE', // ice
  Foggy: '#9CA3AF', // gray
  Windy: '#2DD4BF', // teal
  Hazy: '#FB923C', // orange
}

/** Rain wallpaper only for wet conditions. */
export function shouldPlayRainVideo(label: WeatherCondition | null | undefined): boolean {
  return label === 'Rainy'
}
