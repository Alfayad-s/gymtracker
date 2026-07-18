'use client'

import { motion } from 'framer-motion'
import {
  Activity,
  Flame,
  Scale,
  Target,
  Percent,
  Dumbbell,
  HeartPulse,
  Gauge,
} from 'lucide-react'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import { formatMetric, toNum } from '@/lib/body-composition/metrics'
import {
  extractSectionBody,
  parseAnalysisSections,
  stripMarkdown,
} from '@/lib/body-composition/parse-analysis'
import { cn } from '@/lib/utils'

const CARDS: Array<{
  key: keyof BodyCompositionReport
  label: string
  suffix: string
  icon: typeof Scale
  color: string
}> = [
  { key: 'weight', label: 'Current Weight', suffix: ' kg', icon: Scale, color: 'text-primary' },
  { key: 'bodyFatPercent', label: 'Body Fat %', suffix: '%', icon: Percent, color: 'text-warning' },
  {
    key: 'skeletalMuscleMass',
    label: 'Skeletal Muscle',
    suffix: ' kg',
    icon: Dumbbell,
    color: 'text-sky-500',
  },
  { key: 'bmi', label: 'BMI', suffix: '', icon: Activity, color: 'text-primary' },
  { key: 'bodyScore', label: 'Body Score', suffix: '', icon: Gauge, color: 'text-primary' },
  {
    key: 'visceralFat',
    label: 'Visceral Fat',
    suffix: '',
    icon: HeartPulse,
    color: 'text-destructive',
  },
  { key: 'bmr', label: 'BMR', suffix: ' kcal', icon: Flame, color: 'text-warning' },
  {
    key: 'targetWeight',
    label: 'Target Weight',
    suffix: ' kg',
    icon: Target,
    color: 'text-sky-500',
  },
]

function bmiCategory(bmi: number): { label: string; className: string } {
  if (bmi < 18.5) return { label: 'Underweight', className: 'text-sky-500' }
  if (bmi < 25) return { label: 'Normal', className: 'text-primary' }
  if (bmi < 30) return { label: 'Overweight', className: 'text-warning' }
  return { label: 'Obese', className: 'text-destructive' }
}

function bmiInsight(analysis: string | null | undefined, bmi: number | null): string | null {
  if (analysis) {
    const fromAi = extractSectionBody(parseAnalysisSections(analysis), /\bbmi\b/i)
    if (fromAi) {
      // Keep tip short for the card
      const sentence = stripMarkdown(fromAi).split(/(?<=[.!?])\s+/)[0]
      if (sentence && sentence.length > 12) {
        return sentence.length > 110 ? `${sentence.slice(0, 107)}…` : sentence
      }
    }
  }
  if (bmi == null) return null
  const cat = bmiCategory(bmi)
  if (cat.label === 'Normal') return 'BMI is in the healthy range — keep current habits consistent.'
  if (cat.label === 'Underweight') return 'BMI is below the healthy range — prioritize muscle-building nutrition.'
  if (cat.label === 'Overweight') return 'BMI is above the healthy range — focus on fat loss while preserving muscle.'
  return 'BMI is in the obese range — prioritize sustainable fat loss with strength training.'
}

export function MetricCards({
  report,
  analysis,
}: {
  report: BodyCompositionReport
  analysis?: string | null
}) {
  const bmi = toNum(report.bmi)
  const tip = bmiInsight(analysis, bmi)

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CARDS.map((card, i) => {
        const Icon = card.icon
        const value = report[card.key]
        const num = typeof value === 'number' ? value : null
        const isBmi = card.key === 'bmi'
        const category = isBmi && bmi != null ? bmiCategory(bmi) : null

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            className={cn(
              'rounded-[20px] border border-border/60 bg-card/60 backdrop-blur-md p-3.5 space-y-1.5',
              isBmi && tip && 'col-span-2'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              {category && (
                <span
                  className={cn(
                    'ml-auto text-[9px] font-bold uppercase tracking-wider',
                    category.className
                  )}
                >
                  {category.label}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums tracking-tight">
              {formatMetric(num, card.suffix)}
            </p>
            {isBmi && tip && (
              <p className="text-[11px] leading-relaxed text-muted-foreground pt-0.5 border-t border-border/40 mt-1">
                <span className="font-semibold text-primary">AI tip · </span>
                {tip}
              </p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
