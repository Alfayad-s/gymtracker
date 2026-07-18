import { BodyCompositionExtractSchema, type BodyCompositionExtract } from './types'

function coerceNum(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function coerceSegmental(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return {
    leftArm: coerceNum(v.leftArm ?? v.left_arm),
    rightArm: coerceNum(v.rightArm ?? v.right_arm),
    trunk: coerceNum(v.trunk),
    leftLeg: coerceNum(v.leftLeg ?? v.left_leg),
    rightLeg: coerceNum(v.rightLeg ?? v.right_leg),
  }
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
      date: typeof parsed.date === 'string' ? parsed.date : null,
      height: coerceNum(parsed.height),
      weight: coerceNum(parsed.weight),
      bodyScore: coerceNum(parsed.bodyScore ?? parsed.score),
      bmi: coerceNum(parsed.bmi),
      bodyFatPercent: coerceNum(parsed.bodyFatPercent ?? parsed.bodyFatPercentage),
      bodyFatMass: coerceNum(parsed.bodyFatMass),
      skeletalMuscleMass: coerceNum(parsed.skeletalMuscleMass ?? parsed.smm),
      leanBodyMass: coerceNum(parsed.leanBodyMass ?? parsed.lbm),
      protein: coerceNum(parsed.protein),
      minerals: coerceNum(parsed.minerals),
      totalBodyWater: coerceNum(parsed.totalBodyWater ?? parsed.tbw),
      visceralFat: coerceNum(parsed.visceralFat ?? parsed.visceralFatLevel),
      waistHipRatio: coerceNum(parsed.waistHipRatio ?? parsed.whr),
      bmr: coerceNum(parsed.bmr),
      recommendedCalories: coerceNum(parsed.recommendedCalories),
      targetWeight: coerceNum(parsed.targetWeight),
      weightControl: coerceNum(parsed.weightControl),
      fatControl: coerceNum(parsed.fatControl),
      muscleControl: coerceNum(parsed.muscleControl),
      segmentalLean: coerceSegmental(parsed.segmentalLean),
      segmentalFat: coerceSegmental(parsed.segmentalFat),
    }
    const result = BodyCompositionExtractSchema.safeParse(candidate)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
