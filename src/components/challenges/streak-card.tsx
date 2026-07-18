'use client'

import { motion } from 'framer-motion'
import { Flame, Trophy } from 'lucide-react'
import type { UserRewards } from '@/lib/challenges/types'
import { levelProgress } from '@/lib/challenges/rewards'

export function StreakCard({ rewards }: { rewards: UserRewards }) {
  const progress = levelProgress(rewards.xp)

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/70 backdrop-blur-md p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[16px] bg-warning/10 border border-warning/25 px-3 py-3">
          <div className="flex items-center gap-1.5 text-warning mb-1">
            <Flame className="w-4 h-4 fill-warning/40" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Current</span>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {rewards.currentStreak}
            <span className="text-sm font-semibold text-muted-foreground ml-1">days</span>
          </p>
        </div>
        <div className="rounded-[16px] bg-primary/10 border border-primary/25 px-3 py-3">
          <div className="flex items-center gap-1.5 text-primary mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Longest</span>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {rewards.longestStreak}
            <span className="text-sm font-semibold text-muted-foreground ml-1">days</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Level {progress.level}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {rewards.xp} / {progress.next} XP
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${progress.pct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{rewards.coins} coins</span>
          <span>{rewards.badges.length} badges</span>
        </div>
      </div>
    </div>
  )
}
