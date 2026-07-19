'use client'

import type { BodyCompositionExtract } from '@/lib/body-composition/types'
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/body-composition/parse-date'

const FIELDS: {
  key: Exclude<keyof BodyCompositionExtract, 'date' | 'segmentalLean' | 'segmentalFat'>
  label: string
  unit: string
  step?: string
}[] = [
  { key: 'height', label: 'Height', unit: 'cm', step: '0.1' },
  { key: 'weight', label: 'Weight', unit: 'kg', step: '0.1' },
  { key: 'bodyScore', label: 'InBody score', unit: '', step: '1' },
  { key: 'bmi', label: 'BMI', unit: '', step: '0.1' },
  { key: 'bodyFatPercent', label: 'Body fat %', unit: '%', step: '0.1' },
  { key: 'bodyFatMass', label: 'Body fat mass', unit: 'kg', step: '0.1' },
  { key: 'skeletalMuscleMass', label: 'Skeletal muscle', unit: 'kg', step: '0.1' },
  { key: 'leanBodyMass', label: 'Lean body mass', unit: 'kg', step: '0.1' },
  { key: 'totalBodyWater', label: 'Total body water', unit: 'L', step: '0.1' },
  { key: 'protein', label: 'Protein', unit: 'kg', step: '0.1' },
  { key: 'minerals', label: 'Minerals', unit: 'kg', step: '0.01' },
  { key: 'visceralFat', label: 'Visceral fat', unit: '', step: '1' },
  { key: 'waistHipRatio', label: 'Waist-hip ratio', unit: '', step: '0.01' },
  { key: 'bmr', label: 'BMR', unit: 'kcal', step: '1' },
  { key: 'recommendedCalories', label: 'Recommended cal', unit: 'kcal', step: '1' },
  { key: 'targetWeight', label: 'Target weight', unit: 'kg', step: '0.1' },
  { key: 'weightControl', label: 'Weight control', unit: 'kg', step: '0.1' },
  { key: 'fatControl', label: 'Fat control', unit: 'kg', step: '0.1' },
  { key: 'muscleControl', label: 'Muscle control', unit: 'kg', step: '0.1' },
]

function displayValue(
  key: Exclude<keyof BodyCompositionExtract, 'date' | 'segmentalLean' | 'segmentalFat'>,
  draft: BodyCompositionExtract
): string {
  const v = draft[key]
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  return ''
}

export function ExtractReviewForm({
  draft,
  onChange,
  lowConfidence,
}: {
  draft: BodyCompositionExtract
  onChange: (next: BodyCompositionExtract) => void
  lowConfidence?: boolean
}) {
  const setField = (
    key: Exclude<keyof BodyCompositionExtract, 'date' | 'segmentalLean' | 'segmentalFat'>,
    raw: string
  ) => {
    if (raw.trim() === '') {
      onChange({ ...draft, [key]: null })
      return
    }
    const n = Number(raw)
    onChange({ ...draft, [key]: Number.isFinite(n) ? n : null })
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold text-foreground">Review & fix extracted metrics</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Confirm the test date/time from the report — charts and history use that day, not upload
          time.
        </p>
        {lowConfidence && (
          <p className="text-[11px] text-warning mt-1.5">
            Low confidence extract — please double-check date, weight, fat %, and muscle.
          </p>
        )}
      </div>

      <label className="block rounded-[14px] border border-primary/30 bg-background/80 px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Test date & time (from InBody)
        </span>
        <input
          type="datetime-local"
          value={toDatetimeLocalValue(draft.date)}
          onChange={(e) =>
            onChange({ ...draft, date: fromDatetimeLocalValue(e.target.value) })
          }
          className="mt-1.5 w-full bg-transparent text-sm font-bold text-foreground outline-none"
        />
        <span className="mt-1 block text-[10px] text-muted-foreground">
          Taken from the report&apos;s Test Date / Measured time. History charts plot from this
          timestamp to newer reports.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ key, label, unit, step }) => (
          <label
            key={key}
            className="rounded-[12px] bg-background/60 border border-border px-2.5 py-2"
          >
            <span className="text-[10px] text-muted-foreground font-medium">
              {label}
              {unit ? ` (${unit})` : ''}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={step}
              value={displayValue(key, draft)}
              onChange={(e) => setField(key, e.target.value)}
              placeholder="—"
              className="mt-1 w-full bg-transparent text-sm font-bold text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
