'use client'

import {
  Apple,
  Brain,
  Check,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { DailyChallenge } from '@/lib/challenges/types'
import { cn } from '@/lib/utils'

const ICONS: Record<string, typeof Dumbbell> = {
  dumbbell: Dumbbell,
  'heart-pulse': HeartPulse,
  apple: Apple,
  moon: Moon,
  'trending-up': TrendingUp,
  sparkles: Sparkles,
  brain: Brain,
  droplets: Droplets,
  zap: Zap,
  stretch: Sparkles,
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: 'bg-primary/15 text-primary',
  Medium: 'bg-sky-500/15 text-sky-500',
  Hard: 'bg-warning/15 text-warning',
  Extreme: 'bg-destructive/15 text-destructive',
}

export function ChallengeCard({
  challenge,
  onComplete,
  onSkip,
  onIncrement,
  busy,
}: {
  challenge: DailyChallenge
  onComplete?: () => void
  onSkip?: () => void
  onIncrement?: () => void
  busy?: boolean
}) {
  const Icon = ICONS[challenge.icon ?? ''] ?? Sparkles
  const pct = Math.min(
    100,
    Math.round((challenge.currentValue / Math.max(1, challenge.targetValue)) * 100)
  )
  const done = challenge.status === 'completed'
  const expired = challenge.status === 'expired' || challenge.status === 'skipped'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-[22px] border border-border/60 bg-card/70 backdrop-blur-md p-4 space-y-3',
        done && 'border-primary/30 bg-primary/5',
        expired && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${challenge.color ?? '#8BB820'}22`,
            color: challenge.color ?? '#8BB820',
          }}
        >
          {done ? <Check className="h-5 w-5 text-primary" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground leading-tight">{challenge.title}</h3>
            <span
              className={cn(
                'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                DIFFICULTY_STYLE[challenge.difficulty] ?? 'bg-muted text-muted-foreground'
              )}
            >
              {challenge.difficulty}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{challenge.description}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {challenge.category} · +{challenge.xpReward} XP · +{challenge.coinReward} coins
          </p>
        </div>
      </div>

      {!expired && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>
              {challenge.currentValue}/{challenge.targetValue} {challenge.unit}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.45 }}
            />
          </div>
        </div>
      )}

      {challenge.status === 'pending' && (
        <div className="flex gap-2">
          {!challenge.autoComplete && onIncrement && (
            <button
              type="button"
              disabled={busy}
              onClick={onIncrement}
              className="flex-1 h-10 rounded-[14px] bg-muted text-xs font-bold text-foreground cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              Log progress
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onComplete}
            className="flex-1 h-10 rounded-[14px] bg-primary text-primary-foreground text-xs font-bold cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            Complete
          </button>
          {onSkip && (
            <button
              type="button"
              disabled={busy}
              onClick={onSkip}
              className="h-10 px-3 rounded-[14px] border border-border text-xs font-semibold text-muted-foreground cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </motion.article>
  )
}
