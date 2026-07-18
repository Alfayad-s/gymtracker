'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Dumbbell,
  Flame,
} from 'lucide-react'
import { useHistoryStore, type CompletedWorkout } from '@/stores/historyStore'
import { usePlanStore } from '@/stores/planStore'
import { formatVolumeKg, getActiveStreakDays } from '@/lib/workout-analytics'

function waitForStoreHydration(store: {
  persist?: {
    hasHydrated?: () => boolean
    onFinishHydration?: (cb: () => void) => () => void
  }
}) {
  return new Promise<void>((resolve) => {
    if (store.persist?.hasHydrated?.()) {
      resolve()
      return
    }
    const unsub = store.persist?.onFinishHydration?.(() => {
      unsub?.()
      resolve()
    })
    setTimeout(() => {
      unsub?.()
      resolve()
    }, 800)
  })
}

/** Monday-first offset for the calendar grid. */
function mondayFirstPad(date: Date) {
  const jsDay = getDay(date) // 0 Sun … 6 Sat
  return jsDay === 0 ? 6 : jsDay - 1
}

function toPlanDayOfWeek(date: Date) {
  const jsDay = getDay(date)
  return jsDay === 0 ? 7 : jsDay
}

export default function CalendarPage() {
  const router = useRouter()
  const workouts = useHistoryStore((s) => s.workouts)
  const plans = usePlanStore((s) => s.plans)
  const [hydrated, setHydrated] = useState(false)
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()))

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      waitForStoreHydration(useHistoryStore),
      waitForStoreHydration(usePlanStore),
    ]).then(() => {
      if (!cancelled) setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = startOfDay(new Date())

  const activePlan = useMemo(
    () => plans.find((p) => p.isActive) ?? plans[0] ?? null,
    [plans]
  )

  /** Weekdays (1–7) marked as rest in the active plan — applies to every matching date. */
  const restWeekdays = useMemo(() => {
    const set = new Set<number>()
    if (!activePlan) return set
    for (const day of activePlan.days) {
      if (day.dayOfWeek != null && day.isRestDay) set.add(day.dayOfWeek)
    }
    return set
  }, [activePlan])

  const isPlanRestDay = (date: Date) => restWeekdays.has(toPlanDayOfWeek(date))

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, CompletedWorkout[]>()
    for (const workout of workouts) {
      const key = format(parseISO(workout.completedAt), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(workout)
      map.set(key, list)
    }
    return map
  }, [workouts])

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const leadingBlanks = mondayFirstPad(startOfMonth(cursor))

  const monthStats = useMemo(() => {
    let workoutDays = 0
    let missedDays = 0
    let restDays = 0
    let totalWorkouts = 0
    let totalVolume = 0
    let totalMinutes = 0

    for (const day of monthDays) {
      const key = format(day, 'yyyy-MM-dd')
      const dayWorkouts = workoutsByDay.get(key) ?? []
      const isRest = isPlanRestDay(day)

      if (dayWorkouts.length > 0) {
        workoutDays += 1
        totalWorkouts += dayWorkouts.length
        for (const w of dayWorkouts) {
          totalVolume += w.volumeKg
          totalMinutes += w.durationMinutes
        }
      } else if (isRest) {
        restDays += 1
      } else if (isBefore(day, today)) {
        missedDays += 1
      }
    }

    return { workoutDays, missedDays, restDays, totalWorkouts, totalVolume, totalMinutes }
  }, [monthDays, workoutsByDay, today, restWeekdays])

  const selectedKey = format(selectedDay, 'yyyy-MM-dd')
  const selectedWorkouts = workoutsByDay.get(selectedKey) ?? []
  const streakDays = hydrated ? getActiveStreakDays(workouts) : 0
  const selectedPlanDay = useMemo(() => {
    if (!activePlan) return null
    const dow = toPlanDayOfWeek(selectedDay)
    return activePlan.days.find((d) => d.dayOfWeek === dow) ?? null
  }, [activePlan, selectedDay])

  const dayTone = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd')
    const hasWorkout = (workoutsByDay.get(key)?.length ?? 0) > 0
    const isFuture = isAfter(day, today)
    const isRest = isPlanRestDay(day)

    if (hasWorkout) return 'workout' as const
    if (isRest) return 'rest' as const
    if (isFuture) return 'future' as const
    return 'missed' as const
  }

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Calendar</h1>
          <p className="text-xs text-muted-foreground">Your real training history</p>
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-4 animate-pulse" aria-busy="true">
          <div className="h-64 rounded-[24px] bg-muted/80" />
          <div className="h-32 rounded-[24px] bg-muted/80" />
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-[24px] p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCursor((d) => startOfMonth(subMonths(d, 1)))}
                className="p-2 rounded-xl bg-muted border border-border text-foreground cursor-pointer active:scale-95"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">
                  {format(cursor, 'MMMM yyyy')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {monthStats.workoutDays} workout day{monthStats.workoutDays === 1 ? '' : 's'}
                  {' · '}
                  {monthStats.totalWorkouts} session{monthStats.totalWorkouts === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCursor((d) => startOfMonth(addMonths(d, 1)))}
                className="p-2 rounded-xl bg-muted border border-border text-foreground cursor-pointer active:scale-95"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
                <span
                  key={`${d}-${idx}`}
                  className="text-[10px] font-bold text-muted-foreground uppercase py-1"
                >
                  {d}
                </span>
              ))}

              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {monthDays.map((day) => {
                const tone = dayTone(day)
                const selected = isSameDay(day, selectedDay)
                const key = format(day, 'yyyy-MM-dd')
                const count = workoutsByDay.get(key)?.length ?? 0

                const toneClass =
                  tone === 'workout'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : tone === 'rest'
                      ? 'bg-sky-500/20 border border-sky-500/40 text-sky-500'
                      : tone === 'missed'
                        ? 'bg-destructive/20 border border-destructive/50 text-destructive'
                        : 'bg-muted/40 border border-border text-muted-foreground'

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day)
                      if (!isSameMonth(day, cursor)) {
                        setCursor(startOfMonth(day))
                      }
                    }}
                    className={`aspect-square rounded-full flex flex-col items-center justify-center text-xs font-bold transition-all relative cursor-pointer active:scale-95 ${toneClass} ${
                      selected ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground/40' : ''
                    } ${isSameDay(day, today) && tone === 'missed' ? 'ring-1 ring-destructive/60' : ''} ${
                      isSameDay(day, today) && tone === 'workout' ? 'ring-1 ring-primary' : ''
                    } ${isSameDay(day, today) && tone === 'rest' ? 'ring-1 ring-sky-500/60' : ''}`}
                  >
                    {tone === 'rest' && count === 0 ? (
                      <Coffee className="w-3.5 h-3.5 mb-0.5" />
                    ) : null}
                    <span className={tone === 'rest' && count === 0 ? 'text-[10px]' : ''}>
                      {format(day, 'd')}
                    </span>
                    {count > 1 && (
                      <span className="absolute bottom-1 text-[8px] font-bold opacity-90">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[10px] font-medium">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Workout
              </span>
              <span className="flex items-center gap-1.5 text-sky-500">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500/80" /> Rest
              </span>
              <span className="flex items-center gap-1.5 text-destructive">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" /> No workout
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border" /> Upcoming
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-card border border-border rounded-[18px] p-3 text-center">
              <p className="text-lg font-bold text-primary tabular-nums">
                {monthStats.workoutDays}
              </p>
              <p className="text-[10px] text-muted-foreground">Trained</p>
            </div>
            <div className="bg-card border border-border rounded-[18px] p-3 text-center">
              <p className="text-lg font-bold text-sky-500 tabular-nums">
                {monthStats.restDays}
              </p>
              <p className="text-[10px] text-muted-foreground">Rest days</p>
            </div>
            <div className="bg-card border border-border rounded-[18px] p-3 text-center">
              <p className="text-lg font-bold text-warning tabular-nums flex items-center justify-center gap-1">
                <Flame className="w-4 h-4" />
                {streakDays}
              </p>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between px-0.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {format(selectedDay, 'EEEE, MMM d')}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {selectedWorkouts.length > 0
                  ? `${selectedWorkouts.length} session${selectedWorkouts.length === 1 ? '' : 's'}`
                  : dayTone(selectedDay) === 'rest'
                    ? 'Rest day'
                    : dayTone(selectedDay) === 'future'
                      ? 'Upcoming'
                      : 'No workout'}
              </span>
            </div>

            {selectedWorkouts.length === 0 ? (
              <div
                className={`rounded-[20px] border p-4 ${
                  dayTone(selectedDay) === 'missed'
                    ? 'border-destructive/30 bg-destructive/10'
                    : dayTone(selectedDay) === 'rest'
                      ? 'border-sky-500/30 bg-sky-500/10'
                      : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  {dayTone(selectedDay) === 'rest' && (
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                      <Coffee className="w-4 h-4 text-sky-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {dayTone(selectedDay) === 'rest'
                        ? selectedPlanDay?.name || 'Rest Day'
                        : dayTone(selectedDay) === 'future'
                          ? 'Day not reached yet'
                          : isSameDay(selectedDay, today)
                            ? 'No session logged today'
                            : 'Missed training day'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {dayTone(selectedDay) === 'rest'
                        ? 'Scheduled rest from your active plan — every matching weekday is a rest day.'
                        : dayTone(selectedDay) === 'future'
                          ? 'Future days stay neutral until they pass.'
                          : 'Days without a completed workout show in red on the calendar.'}
                    </p>
                  </div>
                </div>
                {dayTone(selectedDay) === 'rest' && activePlan && selectedPlanDay && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/plans/${activePlan.id}/days/${selectedPlanDay.id}`)
                    }
                    className="mt-3 h-10 px-4 rounded-[14px] border border-sky-500/30 bg-sky-500/15 text-sky-500 text-xs font-bold cursor-pointer"
                  >
                    View plan day
                  </button>
                )}
                {dayTone(selectedDay) === 'missed' && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="mt-3 h-10 px-4 rounded-[14px] bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                  >
                    Start a workout
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedWorkouts.map((workout) => (
                  <button
                    key={workout.id}
                    type="button"
                    onClick={() => router.push('/history')}
                    className="w-full text-left bg-card border border-border rounded-[20px] p-4 space-y-2 cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {workout.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(parseISO(workout.completedAt), 'h:mm a')}
                          {' · '}
                          {workout.durationMinutes} min
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      <span>
                        <span className="font-bold text-foreground">{workout.totalSets}</span>{' '}
                        sets
                      </span>
                      <span>
                        <span className="font-bold text-foreground">
                          {formatVolumeKg(workout.volumeKg)}
                        </span>{' '}
                        volume
                      </span>
                      <span>
                        <span className="font-bold text-foreground">
                          {workout.exercises.length}
                        </span>{' '}
                        exercises
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {(monthStats.totalMinutes > 0 || monthStats.totalVolume > 0) && (
            <div className="bg-transparent rounded-[20px] border border-border/60 p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Month time
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {monthStats.totalMinutes} min
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Month volume
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {formatVolumeKg(monthStats.totalVolume)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
