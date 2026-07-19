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

export const EXTRACT_JSON_PROMPT = `You extract fields from InBody / BIA body composition reports (InBody 270, 370, 570, 770, Dial, H20, etc.).

Return ONLY valid JSON (no markdown, no prose, no units inside numbers) with this exact shape:
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

Label mapping (use these names → JSON keys):
- Height / HT → height (cm)
- Weight / WT → weight (kg)
- InBody Score / Body Composition Score → bodyScore
- BMI → bmi
- PBF / Percent Body Fat / Body Fat % → bodyFatPercent
- BFM / Body Fat Mass → bodyFatMass (kg)
- SMM / Skeletal Muscle Mass → skeletalMuscleMass (kg)
- FFM / Soft Lean Mass / Lean Body Mass / LBM → leanBodyMass (kg)
- Protein → protein (kg)
- Minerals / Bone Mineral Content → minerals (kg)
- TBW / Total Body Water → totalBodyWater (L or kg as printed)
- VFL / Visceral Fat Level / Visceral Fat Area → visceralFat (use the level number when both exist)
- WHR / Waist-Hip Ratio → waistHipRatio
- BMR / Basal Metabolic Rate → bmr (kcal)
- Recommended Calorie Intake / Target Calorie → recommendedCalories
- Target Weight → targetWeight
- Weight Control / Fat Control / Muscle Control → weightControl / fatControl / muscleControl (keep sign: +/−)

Segmental lean/fat (kg):
- Left Arm / L-Arm / LA → leftArm
- Right Arm / R-Arm / RA → rightArm
- Trunk / TR → trunk
- Left Leg / L-Leg / LL → leftLeg
- Right Leg / R-Leg / RL → rightLeg

Rules:
1. Metric units only (cm, kg, kcal). Convert lb→kg (÷2.2046) and in→cm (×2.54) if needed.
2. Missing values must be null — never invent numbers.
3. Do not confuse Body Fat Mass (kg) with Percent Body Fat (%).
4. Do not swap SMM with weight or lean mass.
5. Prefer the measured/analysis values, not the normal range min/max.
6. date MUST be the test / measurement date-time printed on the report (Test Date, Measured, ID / Date, Time), NOT today's upload date. Prefer ISO "YYYY-MM-DDTHH:mm:ss" when time is shown; otherwise "YYYY-MM-DD". Include time when the report prints it.`

/** OCR transcription system prompt for vision models. */
export const OCR_TRANSCRIBE_PROMPT = `You are a careful OCR engine for InBody / BIA body composition reports.

Return plain text only (no markdown). Transcribe EVERY readable label and number exactly as printed.
Preserve layout cues with newlines. Keep units next to values when shown (kg, %, cm, kcal).
Include: test date and time, score, weight, height, BMI, PBF, BFM, SMM, FFM/LBM, TBW, protein, minerals, visceral fat, WHR, BMR, control values, and segmental lean/fat tables (arms, trunk, legs).
Always capture the printed Test Date / Measured Date / Time line exactly (e.g. "2024.07.15 14:32").
Do not invent missing values.`
