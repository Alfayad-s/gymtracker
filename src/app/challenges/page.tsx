'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { ChallengeList } from '@/components/challenges/challenge-list'
import { ChallengeProgress } from '@/components/challenges/challenge-progress'
import { RewardDialog } from '@/components/challenges/reward-dialog'
import { StreakCard } from '@/components/challenges/streak-card'
import { useChallengeContext } from '@/hooks/useChallengeContext'
import { BADGE_DEFS } from '@/lib/challenges/rewards'
import { notifyChallenge } from '@/lib/notifications'
import type {
  ChallengeAnalytics,
  ChallengeHistoryEntry,
  DailyChallenge,
  UserRewards,
} from '@/lib/challenges/types'
import {
  completeChallengeAction,
  getChallengeHistoryAction,
  getTodayChallengesAction,
  skipChallengeAction,
  updateProgressAction,
  type TodayChallengesPayload,
} from '@/server/actions/challenge.actions'

type Tab = 'today' | 'weekly' | 'monthly' | 'history' | 'rewards'

export default function ChallengesPage() {
  const router = useRouter()
  const context = useChallengeContext()
  const [tab, setTab] = useState<Tab>('today')
  const [data, setData] = useState<TodayChallengesPayload | null>(null)
  const [history, setHistory] = useState<ChallengeHistoryEntry[]>([])
  const [historyOffset, setHistoryOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [reward, setReward] = useState<{
    title: string
    xp: number
    coins: number
    leveledUp?: boolean
    level?: number
    allComplete?: boolean
    newBadges?: string[]
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await getTodayChallengesAction(context)
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges')
    } finally {
      setLoading(false)
    }
  }, [context])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount / when date changes
  }, [context.todayDate])

  useEffect(() => {
    if (tab !== 'history') return
    void getChallengeHistoryAction(20, historyOffset)
      .then((rows) => {
        setHistory((prev) => (historyOffset === 0 ? rows : [...prev, ...rows]))
      })
      .catch(() => {})
  }, [tab, historyOffset])

  const pendingChallenges = useMemo(
    () => data?.challenges.filter((c) => c.status === 'pending') ?? [],
    [data]
  )
  const completedChallenges = useMemo(
    () => data?.challenges.filter((c) => c.status === 'completed') ?? [],
    [data]
  )
  const expiredChallenges = useMemo(
    () =>
      data?.challenges.filter((c) => c.status === 'expired' || c.status === 'skipped') ?? [],
    [data]
  )

  const todayXp = completedChallenges.reduce((s, c) => s + c.xpReward, 0)
  const todayCoins = completedChallenges.reduce((s, c) => s + c.coinReward, 0)

  const applyComplete = (result: Awaited<ReturnType<typeof completeChallengeAction>>) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        challenges: prev.challenges.map((c) =>
          c.id === result.challenge.id ? result.challenge : c
        ),
        weekly: prev.weekly.map((c) => (c.id === result.challenge.id ? result.challenge : c)),
        monthly: prev.monthly.map((c) =>
          c.id === result.challenge.id ? result.challenge : c
        ),
        rewards: result.rewards,
      }
    })

    setReward({
      title: result.challenge.title,
      xp: result.challenge.xpReward,
      coins: result.challenge.coinReward,
      leveledUp: result.leveledUp,
      level: result.rewards.level,
      allComplete: result.allDailyComplete,
      newBadges: result.newBadges,
    })

    notifyChallenge(
      result.allDailyComplete ? 'All daily challenges complete!' : 'Challenge completed',
      `+${result.challenge.xpReward} XP · +${result.challenge.coinReward} coins`
    )
    if (result.leveledUp) {
      notifyChallenge('Level up!', `You reached level ${result.rewards.level}`)
    }
  }

  const handleComplete = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      try {
        const result = await completeChallengeAction(id)
        applyComplete(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Complete failed')
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleSkip = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      try {
        const updated = await skipChallengeAction(id)
        setData((prev) =>
          prev
            ? {
                ...prev,
                challenges: prev.challenges.map((c) => (c.id === id ? updated : c)),
              }
            : prev
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Skip failed')
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleIncrement = (id: string) => {
    const challenge =
      data?.challenges.find((c) => c.id === id) ??
      data?.weekly.find((c) => c.id === id) ??
      data?.monthly.find((c) => c.id === id)
    if (!challenge) return
    const next = Math.min(challenge.targetValue, challenge.currentValue + stepFor(challenge))
    setBusyId(id)
    startTransition(async () => {
      try {
        const updated = await updateProgressAction(id, next)
        setData((prev) =>
          prev
            ? {
                ...prev,
                challenges: prev.challenges.map((c) => (c.id === id ? updated : c)),
                weekly: prev.weekly.map((c) => (c.id === id ? updated : c)),
                monthly: prev.monthly.map((c) => (c.id === id ? updated : c)),
              }
            : prev
        )
        if (updated.status === 'completed') {
          setReward({
            title: updated.title,
            xp: updated.xpReward,
            coins: updated.coinReward,
          })
          notifyChallenge(
            'Challenge completed',
            `+${updated.xpReward} XP · +${updated.coinReward} coins`
          )
          // Refresh rewards/streak
          const fresh = await getTodayChallengesAction(context)
          setData(fresh)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed')
      } finally {
        setBusyId(null)
      }
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'history', label: 'History' },
    { id: 'rewards', label: 'Rewards' },
  ]

  return (
    <div className="px-5 pt-5 pb-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-card border border-border text-foreground cursor-pointer active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Daily Challenges</h1>
            <p className="text-[11px] text-muted-foreground">Personalized goals · XP · streaks</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || pending}
          className="p-2 rounded-xl bg-card border border-border text-muted-foreground cursor-pointer active:scale-95 disabled:opacity-50"
          aria-label="Refresh"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-[16px] bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-3" aria-busy>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-[22px] bg-muted/60 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <ChallengeProgress
            completed={completedChallenges.length}
            total={data.challenges.length || 5}
            xp={todayXp}
            coins={todayCoins}
          />
          <StreakCard rewards={data.rewards} />

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id)
                  if (t.id === 'history') setHistoryOffset(0)
                }}
                className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'today' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                  Remaining
                </h2>
                <ChallengeList
                  challenges={pendingChallenges}
                  emptyTitle="All done for today"
                  emptyDescription="Come back tomorrow for a fresh set of challenges."
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  onIncrement={handleIncrement}
                  busyId={busyId}
                />
              </section>
              {completedChallenges.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                    Completed
                  </h2>
                  <ChallengeList challenges={completedChallenges} />
                </section>
              )}
              {expiredChallenges.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                    Expired / Skipped
                  </h2>
                  <ChallengeList challenges={expiredChallenges} />
                </section>
              )}
            </div>
          )}

          {tab === 'weekly' && (
            <ChallengeList
              challenges={data.weekly}
              emptyTitle="Weekly challenges loading"
              emptyDescription="Weekly goals appear every Monday."
              onComplete={handleComplete}
              onIncrement={handleIncrement}
              busyId={busyId}
            />
          )}

          {tab === 'monthly' && (
            <ChallengeList
              challenges={data.monthly}
              emptyTitle="Monthly challenges loading"
              emptyDescription="Monthly goals appear on the 1st."
              onComplete={handleComplete}
              onIncrement={handleIncrement}
              busyId={busyId}
            />
          )}

          {tab === 'history' && (
            <HistoryPanel
              history={history}
              analytics={data.analytics}
              onLoadMore={() => setHistoryOffset((o) => o + 20)}
            />
          )}

          {tab === 'rewards' && <RewardsPanel rewards={data.rewards} analytics={data.analytics} />}
        </>
      ) : null}

      <RewardDialog
        open={Boolean(reward)}
        onClose={() => setReward(null)}
        title={reward?.title ?? ''}
        xp={reward?.xp ?? 0}
        coins={reward?.coins ?? 0}
        leveledUp={reward?.leveledUp}
        level={reward?.level}
        allComplete={reward?.allComplete}
        newBadges={reward?.newBadges}
      />
    </div>
  )
}

function stepFor(c: DailyChallenge): number {
  if (c.unit === 'ml') return Math.max(250, Math.round(c.targetValue / 4))
  if (c.unit === 'g') return Math.max(10, Math.round(c.targetValue / 5))
  if (c.unit === 'steps') return Math.max(1000, Math.round(c.targetValue / 5))
  if (c.unit === 'minutes' || c.unit === 'hours') return 1
  return 1
}

function HistoryPanel({
  history,
  analytics,
  onLoadMore,
}: {
  history: ChallengeHistoryEntry[]
  analytics: ChallengeAnalytics
  onLoadMore: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Completion" value={`${analytics.completionRate}%`} />
        <Stat label="Weekly" value={`${analytics.weeklyCompletionRate}%`} />
        <Stat label="Best category" value={analytics.bestCategory ?? '—'} />
        <Stat label="Most missed" value={analytics.mostMissedCategory ?? '—'} />
      </div>
      <div className="space-y-2">
        {history.map((h) => (
          <div
            key={h.id}
            className="rounded-[18px] border border-border/60 bg-card/60 px-3.5 py-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {h.challenge?.title ?? 'Challenge'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {h.completedAt.slice(0, 10)} · {h.challenge?.category}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-primary">+{h.xpEarned} XP</p>
              <p className="text-[10px] text-warning font-semibold">+{h.coinsEarned}</p>
            </div>
          </div>
        ))}
        {history.length >= 20 && (
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full h-10 rounded-[14px] bg-muted text-xs font-bold text-muted-foreground cursor-pointer"
          >
            Load more
          </button>
        )}
      </div>
      <p className="text-[10px] text-center text-muted-foreground">
        Leaderboard — coming soon
      </p>
    </div>
  )
}

function RewardsPanel({
  rewards,
  analytics,
}: {
  rewards: UserRewards
  analytics: ChallengeAnalytics
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Total XP" value={String(analytics.totalXp)} />
        <Stat label="Total coins" value={String(analytics.totalCoins)} />
        <Stat label="Level" value={String(rewards.level)} />
        <Stat label="Badges" value={String(rewards.badges.length)} />
      </div>
      <div className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Badges
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGE_DEFS.map((b) => {
            const unlocked = rewards.badges.includes(b.id)
            return (
              <div
                key={b.id}
                className={`rounded-[16px] border px-3 py-3 ${
                  unlocked
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border/60 bg-card/40 opacity-55'
                }`}
              >
                <p className="text-xs font-bold text-foreground">{b.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {b.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-border/60 bg-card/60 px-3 py-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-bold text-foreground mt-0.5 truncate">{value}</p>
    </div>
  )
}
