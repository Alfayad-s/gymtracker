import { z } from 'zod'

export const SegmentalSchema = z.object({
  leftArm: z.number().nullable().optional(),
  rightArm: z.number().nullable().optional(),
  trunk: z.number().nullable().optional(),
  leftLeg: z.number().nullable().optional(),
  rightLeg: z.number().nullable().optional(),
})

export const BodyCompositionExtractSchema = z.object({
  date: z.string().nullable().optional(),
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  bodyScore: z.number().nullable().optional(),
  bmi: z.number().nullable().optional(),
  bodyFatPercent: z.number().nullable().optional(),
  bodyFatMass: z.number().nullable().optional(),
  skeletalMuscleMass: z.number().nullable().optional(),
  leanBodyMass: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  minerals: z.number().nullable().optional(),
  totalBodyWater: z.number().nullable().optional(),
  visceralFat: z.number().nullable().optional(),
  waistHipRatio: z.number().nullable().optional(),
  bmr: z.number().nullable().optional(),
  recommendedCalories: z.number().nullable().optional(),
  targetWeight: z.number().nullable().optional(),
  weightControl: z.number().nullable().optional(),
  fatControl: z.number().nullable().optional(),
  muscleControl: z.number().nullable().optional(),
  segmentalLean: SegmentalSchema.nullable().optional(),
  segmentalFat: SegmentalSchema.nullable().optional(),
})

export type SegmentalValues = z.infer<typeof SegmentalSchema>
export type BodyCompositionExtract = z.infer<typeof BodyCompositionExtractSchema>

export type BodyCompositionReport = BodyCompositionExtract & {
  id: string
  userId: string
  reportDate: string
  pdfUrl: string | null
  imageUrl: string | null
  rawText: string | null
  aiAnalysis: string | null
  createdAt: string
  updatedAt: string
}

export const EXTRACT_JSON_PROMPT = `You extract InBody / BIA body composition report fields.
Return ONLY valid JSON (no markdown, no prose) with this exact shape:
{
  "date": string | null,
  "height": number | null,
  "weight": number | null,
  "bodyScore": number | null,
  "bmi": number | null,
  "bodyFatPercent": number | null,
  "bodyFatMass": number | null,
  "skeletalMuscleMass": number | null,
  "leanBodyMass": number | null,
  "protein": number | null,
  "minerals": number | null,
  "totalBodyWater": number | null,
  "visceralFat": number | null,
  "waistHipRatio": number | null,
  "bmr": number | null,
  "recommendedCalories": number | null,
  "targetWeight": number | null,
  "weightControl": number | null,
  "fatControl": number | null,
  "muscleControl": number | null,
  "segmentalLean": { "leftArm": number|null, "rightArm": number|null, "trunk": number|null, "leftLeg": number|null, "rightLeg": number|null } | null,
  "segmentalFat": { "leftArm": number|null, "rightArm": number|null, "trunk": number|null, "leftLeg": number|null, "rightLeg": number|null } | null
}
Use metric units (cm, kg, kcal). Missing values must be null. Numbers only — no units in values.`
