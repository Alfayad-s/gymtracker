'use client'

import { motion } from 'framer-motion'

export function ChallengeProgress({
  completed,
  total,
  xp,
  coins,
}: {
  completed: number
  total: number
  xp: number
  coins: number
}) {
  const pct = total ? Math.round((completed / total) * 100) : 0
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/70 backdrop-blur-md p-4 flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground tabular-nums">
            {completed}/{total}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Done
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Today&apos;s Progress
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-background/50 border border-border/50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">XP</p>
            <p className="text-base font-bold text-primary tabular-nums">+{xp}</p>
          </div>
          <div className="rounded-[14px] bg-background/50 border border-border/50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Coins</p>
            <p className="text-base font-bold text-warning tabular-nums">+{coins}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
