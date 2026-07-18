'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Flame, Loader2, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChallengeContext } from '@/hooks/useChallengeContext'
import { getTodayChallengesAction } from '@/server/actions/challenge.actions'

export function ChallengesWidget() {
  const router = useRouter()
  const context = useChallengeContext()
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(5)
  const [xp, setXp] = useState(0)
  const [coins, setCoins] = useState(0)
  const [streak, setStreak] = useState(0)
  const [remainingTitles, setRemainingTitles] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getTodayChallengesAction(context)
        if (cancelled) return
        const done = data.challenges.filter((c) => c.status === 'completed')
        const pending = data.challenges.filter((c) => c.status === 'pending')
        setCompleted(done.length)
        setTotal(data.challenges.length || 5)
        setXp(done.reduce((s, c) => s + c.xpReward, 0))
        setCoins(done.reduce((s, c) => s + c.coinReward, 0))
        setStreak(data.rewards.currentStreak)
        setRemainingTitles(pending.slice(0, 3).map((c) => c.title))
      } catch {
        /* silent — widget is best-effort */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.todayDate])

  const pct = total ? Math.round((completed / total) * 100) : 0
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <button
      type="button"
      onClick={() => router.push('/challenges')}
      className="w-full rounded-[24px] border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4 text-left cursor-pointer active:scale-[0.99] transition-transform space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Today&apos;s Challenges
          </h2>
        </div>
        <ChevronRight className="w-4 h-4 text-primary" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading challenges…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
                <motion.circle
                  cx="36"
                  cy="36"
                  r={r}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 0.6 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold tabular-nums text-foreground">
                  {completed}/{total}
                </span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <MiniStat label="XP" value={`+${xp}`} />
              <MiniStat label="Coins" value={`+${coins}`} />
              <MiniStat
                label="Streak"
                value={String(streak)}
                icon={<Flame className="w-3 h-3 text-warning" />}
              />
            </div>
          </div>
          {remainingTitles.length > 0 ? (
            <div className="space-y-1.5">
              {remainingTitles.map((t) => (
                <div
                  key={t}
                  className="rounded-[12px] bg-background/50 border border-border/40 px-3 py-2 text-xs font-semibold text-foreground truncate"
                >
                  {t}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">All challenges complete — nice work!</p>
          )}
        </>
      )}
    </button>
  )
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-[12px] bg-background/50 border border-border/40 px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
