'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Dumbbell,
  Scale,
  Plus,
  Target,
  Minus,
  ScanLine,
  ChevronRight,
} from 'lucide-react'
import { useHistoryStore } from '@/stores/historyStore'
import { useProgressStore, computeBodyWeightStats } from '@/stores/progressStore'
import {
  getVolumeOverTime,
  getMaxWeightOverTime,
  getWorkoutFrequency,
  getWeeklyVolume,
  getGlobalHighlights,
  getActiveStreakWeeks,
} from '@/lib/workout-analytics'

const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  fontSize: 11,
}

export default function ProgressPage() {
  const router = useRouter()
  const workouts = useHistoryStore((s) => s.workouts)
  const bodyWeightLog = useProgressStore((s) => s.bodyWeightLog)
  const addBodyWeight = useProgressStore((s) => s.addBodyWeight)
  const goalWeight = useProgressStore((s) => s.goalWeight)
  const setGoalWeight = useProgressStore((s) => s.setGoalWeight)
  const [mounted, setMounted] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [showWeightForm, setShowWeightForm] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [showGoalForm, setShowGoalForm] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHydrated(true)
  }, [])

  const data = useMemo(() => {
    if (!hydrated) {
      return {
        volumeOverTime: [],
        maxWeightOverTime: [],
        frequency: [],
        weeklyVolume: [],
        highlights: null,
        streakWeeks: 0,
        bodyWeight: [],
      }
    }
    const sortedWeight = [...bodyWeightLog].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    return {
      volumeOverTime: getVolumeOverTime(workouts, 10),
      maxWeightOverTime: getMaxWeightOverTime(workouts, 10),
      frequency: getWorkoutFrequency(workouts, 8),
      weeklyVolume: getWeeklyVolume(workouts, 8),
      highlights: getGlobalHighlights(workouts),
      streakWeeks: getActiveStreakWeeks(workouts),
      bodyWeight: sortedWeight.slice(-12).map((e) => ({
        label: format(parseISO(e.date), 'MMM d'),
        date: e.date,
        weight: e.weight,
      })),
    }
  }, [hydrated, workouts, bodyWeightLog])

  const handleAddWeight = () => {
    const w = parseFloat(weightInput)
    if (!w || w <= 0) return
    addBodyWeight(w)
    setWeightInput('')
    setShowWeightForm(false)
    void import('@/server/actions/challenge.actions').then(({ syncAutoCompletionsAction }) => {
      const todayDate = new Date().toISOString().slice(0, 10)
      void syncAutoCompletionsAction({ todayDate, event: 'weight' })
    })
  }

  const handleSaveGoal = () => {
    const g = parseFloat(goalInput)
    if (!g || g <= 0) return
    setGoalWeight(g)
    setGoalInput('')
    setShowGoalForm(false)
  }

  const bodyWeightStats = useMemo(
    () => (hydrated ? computeBodyWeightStats(bodyWeightLog, goalWeight) : null),
    [hydrated, bodyWeightLog, goalWeight]
  )

  const hasWorkouts = hydrated && workouts.length > 0

  return (
    <div className="p-6 space-y-6 pb-8">
      <div className="mt-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Progress</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Volume, weight lifted, frequency, and body weight over time.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push('/body-composition')}
        className="w-full rounded-[20px] border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <ScanLine className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-foreground">Body Composition</p>
            <p className="text-[11px] text-muted-foreground">
              Upload InBody reports · AI metrics · charts
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-primary shrink-0" />
      </button>

      {/* Highlights */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-[20px] p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Top Est. 1RM
          </span>
          <h3 className="text-lg font-bold text-foreground tabular-nums">
            {data.highlights?.top1RM
              ? `${data.highlights.top1RM.estimated1RM.value} kg`
              : '—'}
          </h3>
          <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5 truncate">
            <TrendingUp className="w-3 h-3 shrink-0" />
            {data.highlights?.top1RM?.exerciseName ?? 'Complete workouts to track'}
          </span>
        </div>
        <div className="bg-card border border-border rounded-[20px] p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Active Streak
          </span>
          <h3 className="text-lg font-bold text-foreground tabular-nums">
            {data.streakWeeks} {data.streakWeeks === 1 ? 'Week' : 'Weeks'}
          </h3>
          <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5">
            <Activity className="w-3 h-3" />
            {hasWorkouts ? `${workouts.length} sessions logged` : 'No sessions yet'}
          </span>
        </div>
      </div>

      {!hasWorkouts && (
        <div className="flex items-center gap-3 bg-card border border-dashed border-border rounded-[20px] p-4">
          <Dumbbell className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Finish workouts to populate your progress charts automatically.
          </p>
        </div>
      )}

      {/* Weight lifted (max per session) */}
      <ChartCard
        title="Weight Lifted"
        subtitle="Max single lift per session (kg)"
        mounted={mounted}
        empty={data.maxWeightOverTime.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.maxWeightOverTime} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: 'var(--muted-foreground)' }} />
            <Line
              type="monotone"
              dataKey="maxWeight"
              name="Max kg"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--primary)', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Session volume */}
      <ChartCard
        title="Volume"
        subtitle="Total kg lifted per session"
        mounted={mounted}
        empty={data.volumeOverTime.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.volumeOverTime} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: 'var(--muted-foreground)' }} />
            <Bar dataKey="volume" name="Volume kg" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Weekly volume trend */}
      <ChartCard
        title="Weekly Volume"
        subtitle="Total kg per week"
        mounted={mounted}
        empty={data.weeklyVolume.every((w) => w.volume === 0)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.weeklyVolume} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: 'var(--muted-foreground)' }} />
            <Bar dataKey="volume" name="Weekly kg" fill="var(--chart-2)" radius={[6, 6, 0, 0]} opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Workout frequency */}
      <ChartCard
        title="Workout Frequency"
        subtitle="Sessions per week"
        mounted={mounted}
        empty={data.frequency.every((w) => w.count === 0)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.frequency} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: 'var(--muted-foreground)' }} />
            <Bar dataKey="count" name="Workouts" fill="var(--warning)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Body weight tracking */}
      <div className="bg-card border border-border rounded-[24px] p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-muted-foreground" />
              Body Weight
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Weight, goal, and weekly change
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowWeightForm((v) => !v)}
            className="h-8 px-3 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Log
          </button>
        </div>

        {/* Stat row: current / goal / weekly change */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-[16px] p-3">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Current</p>
            <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
              {bodyWeightStats?.current != null
                ? `${bodyWeightStats.current.toFixed(1)}`
                : '—'}
              <span className="text-[10px] text-muted-foreground font-medium ml-0.5">kg</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setGoalInput(goalWeight ? String(goalWeight) : '')
              setShowGoalForm((v) => !v)
            }}
            className="bg-muted rounded-[16px] p-3 text-left cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <Target className="w-2.5 h-2.5" /> Goal
            </p>
            <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
              {goalWeight != null ? `${goalWeight.toFixed(1)}` : 'Set'}
              {goalWeight != null && (
                <span className="text-[10px] text-muted-foreground font-medium ml-0.5">kg</span>
              )}
            </p>
          </button>

          <div className="bg-muted rounded-[16px] p-3">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
              Weekly Δ
            </p>
            <p
              className={`text-lg font-bold tabular-nums mt-0.5 flex items-center gap-0.5 ${
                bodyWeightStats?.weeklyChange == null
                  ? 'text-foreground'
                  : bodyWeightStats.weeklyChange > 0.05
                    ? 'text-primary'
                    : bodyWeightStats.weeklyChange < -0.05
                      ? 'text-sky-500'
                      : 'text-foreground'
              }`}
            >
              {bodyWeightStats?.weeklyChange == null ? (
                '—'
              ) : (
                <>
                  {bodyWeightStats.weeklyChange > 0.05 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : bodyWeightStats.weeklyChange < -0.05 ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(bodyWeightStats.weeklyChange).toFixed(1)}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Goal progress line */}
        {goalWeight != null && bodyWeightStats?.toGoal != null && (
          <p className="text-[11px] text-muted-foreground">
            {Math.abs(bodyWeightStats.toGoal) < 0.1 ? (
              <span className="text-primary font-semibold">Goal reached! 🎯</span>
            ) : (
              <>
                <span
                  className={`font-bold ${bodyWeightStats.toGoal > 0 ? 'text-sky-500' : 'text-primary'}`}
                >
                  {Math.abs(bodyWeightStats.toGoal).toFixed(1)} kg
                </span>{' '}
                {bodyWeightStats.toGoal > 0 ? 'to lose' : 'to gain'} to reach your goal
              </>
            )}
          </p>
        )}

        {showGoalForm && (
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Goal weight, e.g. 78"
              className="flex-1 h-10 bg-muted border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleSaveGoal}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold cursor-pointer"
            >
              Save
            </button>
            {goalWeight != null && (
              <button
                type="button"
                onClick={() => {
                  setGoalWeight(null)
                  setShowGoalForm(false)
                }}
                className="h-10 px-3 rounded-xl bg-muted text-destructive text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {showWeightForm && (
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Today's weight, e.g. 81.5"
              className="flex-1 h-10 bg-muted border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddWeight}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold cursor-pointer"
            >
              Save
            </button>
          </div>
        )}

        <div className="h-44 w-full text-xs">
          {mounted && data.bodyWeight.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.bodyWeight} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  stroke="var(--chart-axis)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: 'var(--muted-foreground)' }} />
                {goalWeight != null && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="var(--warning)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Goal ${goalWeight}kg`,
                      position: 'insideTopRight',
                      fill: 'var(--warning)',
                      fontSize: 9,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="kg"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--primary)', strokeWidth: 0, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
              <Scale className="w-5 h-5 opacity-50" />
              <p className="text-xs">Log body weight to see your trend</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  mounted,
  empty,
  children,
}: {
  title: string
  subtitle: string
  mounted: boolean
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-[24px] p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground font-semibold">{subtitle}</span>
      </div>
      <div className="h-44 w-full text-xs">
        {mounted && !empty ? (
          children
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
            {mounted ? 'No data yet' : 'Loading…'}
          </div>
        )}
      </div>
    </div>
  )
}
