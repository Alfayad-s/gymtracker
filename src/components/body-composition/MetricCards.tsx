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
import { formatMetric } from '@/lib/body-composition/metrics'

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

export function MetricCards({ report }: { report: BodyCompositionReport }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CARDS.map((card, i) => {
        const Icon = card.icon
        const value = report[card.key]
        const num = typeof value === 'number' ? value : null
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            className="rounded-[20px] border border-border/60 bg-card/60 backdrop-blur-md p-3.5 space-y-1.5"
          >
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums tracking-tight">
              {formatMetric(num, card.suffix)}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
