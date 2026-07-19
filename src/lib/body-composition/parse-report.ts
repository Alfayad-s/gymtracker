import {
  BodyCompositionExtractSchema,
  type BodyCompositionExtract,
  type SegmentalValues,
} from './types'
import { parseInBodyDateTime } from './parse-date'

/** Parse numbers from OCR/LLM output, including European decimals (72,5). */
export function coerceNum(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    let s = value.trim()
    if (!s) return null
    // European: 72,5 or 1.234,5 → normalize
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else if (/^\d+,\d+$/.test(s)) {
      s = s.replace(',', '.')
    }
    const n = Number(s.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (key in obj) {
      const n = coerceNum(obj[key])
      if (n != null) return n
    }
  }
  return null
}

function coerceSegmental(value: unknown): SegmentalValues | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return {
    leftArm: pickNum(v, ['leftArm', 'left_arm', 'LA', 'la', 'LArm', 'leftarm']),
    rightArm: pickNum(v, ['rightArm', 'right_arm', 'RA', 'ra', 'RArm', 'rightarm']),
    trunk: pickNum(v, ['trunk', 'TR', 'tr', 'Trunk']),
    leftLeg: pickNum(v, ['leftLeg', 'left_leg', 'LL', 'll', 'LLeg', 'leftleg']),
    rightLeg: pickNum(v, ['rightLeg', 'right_leg', 'RL', 'rl', 'RLeg', 'rightleg']),
  }
}

/** How many important fields were filled — used to pick best extract. */
export function scoreExtractCompleteness(extract: BodyCompositionExtract | null): number {
  if (!extract) return 0
  const keys: (keyof BodyCompositionExtract)[] = [
    'weight',
    'height',
    'bmi',
    'bodyFatPercent',
    'bodyFatMass',
    'skeletalMuscleMass',
    'leanBodyMass',
    'bodyScore',
    'bmr',
    'visceralFat',
    'totalBodyWater',
  ]
  let score = 0
  for (const k of keys) {
    const v = extract[k]
    if (typeof v === 'number' && Number.isFinite(v)) score += 2
  }
  if (extract.segmentalLean) {
    const vals = Object.values(extract.segmentalLean).filter((n) => typeof n === 'number')
    score += Math.min(vals.length, 5)
  }
  if (extract.segmentalFat) {
    const vals = Object.values(extract.segmentalFat).filter((n) => typeof n === 'number')
    score += Math.min(vals.length, 5)
  }
  if (extract.date && parseInBodyDateTime(extract.date)) score += 2
  // Soft sanity: weight and height in plausible adult ranges
  if (extract.weight != null && (extract.weight < 30 || extract.weight > 250)) score -= 3
  if (extract.height != null && (extract.height < 100 || extract.height > 230)) score -= 3
  if (extract.bodyFatPercent != null && (extract.bodyFatPercent < 2 || extract.bodyFatPercent > 70))
    score -= 3
  return score
}

/** True when OCR text looks like a real InBody/BIA report (not PDF garbage). */
export function looksLikeInBodyText(text: string): boolean {
  const t = text.toLowerCase()
  const markers = [
    'inbody',
    'body fat',
    'pbf',
    'smm',
    'skeletal muscle',
    'bmi',
    'basal metabolic',
    'bmr',
    'visceral',
    'segmental',
    'lean mass',
    'body composition',
    'tbw',
    'waist',
  ]
  const hits = markers.filter((m) => t.includes(m)).length
  const hasNumbers = (text.match(/\d+(\.\d+)?/g) ?? []).length >= 8
  return hits >= 2 && hasNumbers && text.length >= 80
}

function pickDate(obj: Record<string, unknown>): string | null {
  const keys = [
    'date',
    'testDate',
    'test_date',
    'measuredDate',
    'measured_date',
    'reportDate',
    'report_date',
    'datetime',
    'dateTime',
    'time',
  ]
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim()) {
      const parsed = parseInBodyDateTime(v)
      return parsed ? parsed.toISOString() : v.trim()
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      const ms = v > 1e12 ? v : v > 1e9 ? v * 1000 : NaN
      if (!Number.isNaN(ms)) return new Date(ms).toISOString()
    }
  }
  return null
}

export function parseBodyCompositionJson(raw: string): BodyCompositionExtract | null {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1')
    .trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first < 0 || last <= first) return null

  try {
    const parsed = JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>
    const candidate = {
      date: pickDate(parsed),
      height: pickNum(parsed, ['height', 'ht', 'Height']),
      weight: pickNum(parsed, ['weight', 'wt', 'Weight']),
      bodyScore: pickNum(parsed, ['bodyScore', 'score', 'inBodyScore', 'inbodyScore']),
      bmi: pickNum(parsed, ['bmi', 'BMI']),
      bodyFatPercent: pickNum(parsed, [
        'bodyFatPercent',
        'bodyFatPercentage',
        'pbf',
        'PBF',
        'percentBodyFat',
      ]),
      bodyFatMass: pickNum(parsed, ['bodyFatMass', 'bfm', 'BFM']),
      skeletalMuscleMass: pickNum(parsed, ['skeletalMuscleMass', 'smm', 'SMM']),
      leanBodyMass: pickNum(parsed, [
        'leanBodyMass',
        'lbm',
        'LBM',
        'ffm',
        'FFM',
        'softLeanMass',
      ]),
      protein: pickNum(parsed, ['protein']),
      minerals: pickNum(parsed, ['minerals', 'boneMineral', 'bmc']),
      totalBodyWater: pickNum(parsed, ['totalBodyWater', 'tbw', 'TBW']),
      visceralFat: pickNum(parsed, [
        'visceralFat',
        'visceralFatLevel',
        'vfl',
        'VFL',
        'visceralFatArea',
      ]),
      waistHipRatio: pickNum(parsed, ['waistHipRatio', 'whr', 'WHR']),
      bmr: pickNum(parsed, ['bmr', 'BMR']),
      recommendedCalories: pickNum(parsed, [
        'recommendedCalories',
        'targetCalories',
        'calorieIntake',
      ]),
      targetWeight: pickNum(parsed, ['targetWeight']),
      weightControl: pickNum(parsed, ['weightControl']),
      fatControl: pickNum(parsed, ['fatControl']),
      muscleControl: pickNum(parsed, ['muscleControl']),
      segmentalLean: coerceSegmental(
        parsed.segmentalLean ?? parsed.segmental_lean ?? parsed.leanSegmental
      ),
      segmentalFat: coerceSegmental(
        parsed.segmentalFat ?? parsed.segmental_fat ?? parsed.fatSegmental
      ),
    }
    const result = BodyCompositionExtractSchema.safeParse(candidate)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
