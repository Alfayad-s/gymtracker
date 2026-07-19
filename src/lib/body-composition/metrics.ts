import type { BodyCompositionReport, SegmentalValues } from './types'

export type ChartRange = '7d' | '30d' | '90d' | '1y' | 'all'

export function filterReportsByRange(
  reports: BodyCompositionReport[],
  range: ChartRange
): BodyCompositionReport[] {
  if (range === 'all') return reports
  const now = Date.now()
  const days =
    range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return reports.filter((r) => new Date(r.reportDate).getTime() >= cutoff)
}

export type DeltaDirection = 'improved' | 'declined' | 'unchanged'

export type MetricDelta = {
  key: string
  label: string
  current: number | null
  previous: number | null
  delta: number | null
  direction: DeltaDirection
}

const LOWER_IS_BETTER = new Set([
  'bodyFatPercent',
  'bodyFatMass',
  'visceralFat',
  'bmi',
  'weight',
])

export function computeDeltas(
  current: BodyCompositionReport,
  previous: BodyCompositionReport | null
): MetricDelta[] {
  const specs: Array<{ key: keyof BodyCompositionReport; label: string }> = [
    { key: 'weight', label: 'Weight' },
    { key: 'bodyFatPercent', label: 'Body Fat %' },
    { key: 'skeletalMuscleMass', label: 'Muscle Mass' },
    { key: 'bmi', label: 'BMI' },
    { key: 'bodyScore', label: 'Body Score' },
    { key: 'bmr', label: 'BMR' },
    { key: 'visceralFat', label: 'Visceral Fat' },
  ]

  return specs.map(({ key, label }) => {
    const cur = toNum(current[key])
    const prev = previous ? toNum(previous[key]) : null
    if (cur == null || prev == null) {
      return { key, label, current: cur, previous: prev, delta: null, direction: 'unchanged' as const }
    }
    const delta = Math.round((cur - prev) * 100) / 100
    let direction: DeltaDirection = 'unchanged'
    if (Math.abs(delta) < 0.05) direction = 'unchanged'
    else if (LOWER_IS_BETTER.has(key)) direction = delta < 0 ? 'improved' : 'declined'
    else direction = delta > 0 ? 'improved' : 'declined'
    return { key, label, current: cur, previous: prev, delta, direction }
  })
}

export function toNum(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function chartSeries(
  reports: BodyCompositionReport[],
  key: keyof BodyCompositionReport
): Array<{ date: string; label: string; value: number; fullDate: string }> {
  return [...reports]
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map((r) => {
      const value = toNum(r[key])
      if (value == null) return null
      const d = new Date(r.reportDate)
      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
      const label = hasTime
        ? d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      return {
        date: label,
        label,
        fullDate: r.reportDate,
        value,
      }
    })
    .filter(Boolean) as Array<{ date: string; label: string; value: number; fullDate: string }>
}

export function formatMetric(value: number | null | undefined, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—'
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded}${suffix}`
}

export function emptySegmental(): SegmentalValues {
  return {
    leftArm: null,
    rightArm: null,
    trunk: null,
    leftLeg: null,
    rightLeg: null,
  }
}
