'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  useWorkoutStore,
  getSessionStats,
  findNextIncompleteSet,
  getSetContext,
} from '@/stores/workoutStore'
import { useTimerStore } from '@/stores/timerStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useRecoveryStore } from '@/stores/recoveryStore'
import { recoveryGroupsForExercise, type RecoveryGroup } from '@/lib/muscle-recovery'
import { WeightPicker } from '@/components/workout/WeightPicker'
import { RepPicker } from '@/components/workout/RepPicker'
import { WorkoutRestCircle } from '@/components/workout/WorkoutRestCircle'
import { useWakeLock } from '@/hooks/useWakeLock'
import { requestNotificationPermission, unlockRestSound } from '@/lib/notifications'
import { Dumbbell, Plus, Check, Timer, Play, Flag, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SpotifyMiniPlayer } from '@/components/spotify/spotify-mini-player'

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function WorkoutPage() {
  const router = useRouter()
  const {
    activeSession,
    cancelWorkout,
    finishWorkout,
    updateSet,
    completeSet,
    startWorkout,
  } = useWorkoutStore()
  const addWorkout = useHistoryStore((s) => s.addWorkout)
  const recordSession = useRecoveryStore((s) => s.recordSession)
  const startTimer = useTimerStore((s) => s.startTimer)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const syncTimer = useTimerStore((s) => s.syncTimer)
  const secondsRemaining = useTimerStore((s) => s.secondsRemaining)
  const justFinished = useTimerStore((s) => s.justFinished)
  const isResting = secondsRemaining > 0 || justFinished

  const [currentSet, setCurrentSet] = useState<{
    exerciseId: string
    setIndex: number
  } | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [showFinish, setShowFinish] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [summary, setSummary] = useState<ReturnType<typeof finishWorkout> | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  // Keep screen on during an active workout (supported browsers)
  useWakeLock(Boolean(activeSession) && !summary)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  // Sync persisted rest timer immediately when opening the workout page
  useEffect(() => {
    syncTimer()
  }, [syncTimer])

  useEffect(() => {
    if (!activeSession) return
    const tick = () => {
      setElapsedMs(Date.now() - new Date(activeSession.startedAt).getTime())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSession?.startedAt, activeSession])

  // Always track the first incomplete set
  useEffect(() => {
    if (!activeSession) {
      setCurrentSet(null)
      return
    }
    if (activeSession.exercises.length === 0) {
      setCurrentSet(null)
      return
    }
    const next = findNextIncompleteSet(activeSession)
    setCurrentSet(next)
  }, [activeSession])

  const stats = useMemo(() => getSessionStats(activeSession), [activeSession])

  const setContext =
    activeSession && currentSet
      ? getSetContext(activeSession, currentSet.exerciseId, currentSet.setIndex)
      : null

  const allSetsComplete =
    activeSession != null &&
    activeSession.exercises.length > 0 &&
    currentSet == null

  const previousSetHint = useMemo(() => {
    if (!setContext || setContext.setIndex === 0) return null
    const prev = setContext.exercise.sets[setContext.setIndex - 1]
    if (!prev?.isCompleted) return null
    return `${prev.weight || 0} kg × ${prev.reps}`
  }, [setContext])

  if (!activeSession) {
    if (summary) {
      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
              <Flag className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Workout Complete</h2>
            <p className="text-sm text-muted-foreground mt-2">{summary.name}</p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-8">
              <div className="bg-card border border-border rounded-[18px] p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Duration</p>
                <p className="text-lg font-bold text-foreground mt-1">{summary.durationMinutes}m</p>
              </div>
              <div className="bg-card border border-border rounded-[18px] p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Volume</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {summary.volumeKg.toLocaleString()}
                </p>
              </div>
              <div className="bg-card border border-border rounded-[18px] p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Sets</p>
                <p className="text-lg font-bold text-foreground mt-1">{summary.totalSets}</p>
              </div>
            </div>

            {summary.exercises.length > 0 && (
              <div className="w-full max-w-sm mt-6 text-left space-y-2">
                {summary.exercises.map((ex) => (
                  <div
                    key={ex.name}
                    className="flex justify-between items-center text-sm bg-muted rounded-xl px-3 py-2.5"
                  >
                    <span className="text-muted-foreground truncate pr-2">{ex.name}</span>
                    <span className="text-foreground font-semibold shrink-0">
                      {ex.sets} sets
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pb-4">
            <Button
              onClick={() => {
                setSummary(null)
                router.push('/history')
              }}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[18px]"
            >
              View History
            </Button>
            <Button
              onClick={() => {
                setSummary(null)
                router.push('/dashboard')
              }}
              className="w-full h-12 bg-card hover:bg-muted/80 text-foreground font-bold rounded-[18px] border border-border"
            >
              Back to Home
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <Dumbbell className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Ready to train?</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">
          Start an empty session or begin today&apos;s plan from Home.
        </p>
        <Button
          onClick={() => startWorkout('Custom Workout')}
          className="mt-6 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[18px] px-6 gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Workout
        </Button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-3 text-xs font-semibold text-muted-foreground cursor-pointer"
        >
          Or open today&apos;s plan from Home
        </button>
      </div>
    )
  }

  const handleCompleteSet = () => {
    if (!currentSet || !setContext) return
    if (setContext.set.isCompleted) return

    const ok = completeSet(currentSet.exerciseId, currentSet.setIndex)
    if (!ok) return

    // Celebration haptic on successful set complete
    try {
      navigator.vibrate?.([40, 60, 40, 60, 80, 40, 120])
    } catch {
      /* unsupported */
    }

    const session = useWorkoutStore.getState().activeSession
    if (!session) return
    const next = findNextIncompleteSet(
      session,
      currentSet.exerciseId,
      currentSet.setIndex
    )

    // Only start rest when another set is coming
    if (next) {
      void requestNotificationPermission()
      void unlockRestSound()
      startTimer(setContext.exercise.restSeconds || 90)
    }

    setCurrentSet(next)
  }

  const handleConfirmFinish = () => {
    stopTimer()
    const result = finishWorkout()
    setShowFinish(false)
    if (result) {
      if (result.totalSets > 0) {
        addWorkout(result)

        const volumeByGroup = new Map<RecoveryGroup, number>()
        for (const ex of result.exercises) {
          const groups = recoveryGroupsForExercise(ex.exerciseId, ex.name)
          for (const group of groups) {
            volumeByGroup.set(group, (volumeByGroup.get(group) ?? 0) + ex.volumeKg)
          }
        }
        if (volumeByGroup.size > 0) {
          recordSession(
            [...volumeByGroup.entries()].map(([group, volumeKg]) => ({ group, volumeKg })),
            result.completedAt
          )
        }

        void import('@/server/actions/challenge.actions').then(({ syncAutoCompletionsAction }) => {
          const todayDate = result.completedAt.slice(0, 10)
          void syncAutoCompletionsAction({ todayDate, event: 'workout' })
        })
      }
      setSummary(result)
    }
  }

  const handleConfirmCancel = () => {
    stopTimer()
    cancelWorkout()
    setShowCancel(false)
    setCurrentSet(null)
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border px-5 py-3.5 z-30">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
              {activeSession.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Timer className="w-3 h-3 text-primary" />
              <span className="text-xs font-mono font-semibold text-primary tabular-nums">
                {formatElapsed(elapsedMs)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                · {stats.completedSets}/{stats.totalSets} sets
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setShowCancel(true)}
              className="h-9 px-3 rounded-[12px] bg-destructive/10 hover:bg-destructive/20 text-destructive border-0"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => setShowFinish(true)}
              className="h-9 px-3 rounded-[12px] bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-bold"
            >
              Finish
            </Button>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${stats.progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5">
        {activeSession.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center border border-dashed border-border rounded-[24px] px-6">
            <Dumbbell className="w-10 h-10 text-muted-foreground mb-4" />
            <h3 className="text-base font-bold text-foreground">No exercises yet</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px]">
              Add lifts to start logging sets one at a time.
            </p>
            <Button
              onClick={() => router.push('/exercise')}
              className="mt-6 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[16px] px-5 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Exercise
            </Button>
          </div>
        ) : isResting ? (
          <WorkoutRestCircle />
        ) : allSetsComplete ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
              <Check className="w-9 h-9 text-primary stroke-[3]" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">All sets done!</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-[260px]">
              {stats.completedSets} sets logged · {stats.volumeKg.toLocaleString()} kg volume
            </p>
            <Button
              onClick={() => setShowFinish(true)}
              className="mt-8 h-[52px] w-full max-w-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[18px] gap-2"
            >
              <Flag className="w-4 h-4" />
              Finish Workout
            </Button>
          </div>
        ) : setContext ? (
          <div className="flex flex-col flex-1">
            {/* Exercise progress dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {activeSession.exercises.map((ex, i) => {
                const done = ex.sets.every((s) => s.isCompleted)
                const current = i === setContext.exerciseIndex
                return (
                  <div
                    key={ex.exerciseId}
                    className={`h-1.5 rounded-full transition-all ${
                      current
                        ? 'w-6 bg-primary'
                        : done
                          ? 'w-1.5 bg-primary/50'
                          : 'w-1.5 bg-muted'
                    }`}
                  />
                )
              })}
            </div>

            {/* Current set focus */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Exercise {setContext.exerciseIndex + 1} of {setContext.exerciseCount}
              </p>
              <h2 className="text-2xl font-bold text-foreground tracking-tight mt-1 max-w-[280px]">
                {setContext.exercise.name}
              </h2>
              {setContext.exercise.equipment && (
                <p className="text-xs text-muted-foreground mt-1">{setContext.exercise.equipment}</p>
              )}

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2">
                <span className="text-sm font-bold text-primary">
                  Set {setContext.set.setNumber} of {setContext.setCount}
                </span>
              </div>

              {previousSetHint && (
                <p className="text-xs text-muted-foreground mt-3">
                  Previous set: <span className="font-semibold text-foreground">{previousSetHint}</span>
                </p>
              )}

              {setContext.exercise.targetReps != null && setContext.setIndex === 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Target {setContext.exercise.targetReps} reps · Rest{' '}
                  {setContext.exercise.restSeconds ?? 90}s after set
                </p>
              )}
            </div>

            {/* Reps first, then weight to avoid horizontal overflow on mobile. */}
            <div className="space-y-3 mt-auto">
              <SpotifyMiniPlayer compact />
              <div className="space-y-2.5">
                <RepPicker
                  value={setContext.set.reps}
                  onChange={(r) =>
                    updateSet(currentSet!.exerciseId, currentSet!.setIndex, { reps: r })
                  }
                />
                <WeightPicker
                  value={setContext.set.weight}
                  onChange={(w) =>
                    updateSet(currentSet!.exerciseId, currentSet!.setIndex, { weight: w })
                  }
                />
              </div>

              <button
                type="button"
                onClick={handleCompleteSet}
                className="w-full h-[56px] rounded-[20px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                Complete Set
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Finish modal */}
      {portalReady &&
        showFinish &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--overlay)] backdrop-blur-sm">
            <div className="w-full sm:max-w-[430px] bg-card border-t border-border rounded-t-[28px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-foreground">Finish workout?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.completedSets} sets logged · {stats.volumeKg.toLocaleString()} kg volume ·{' '}
                  {formatElapsed(elapsedMs)}
                </p>
              </div>
              {stats.completedSets === 0 && (
                <p className="text-xs text-warning">
                  No completed sets yet — finishing will discard this session from history.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFinish(false)}
                  className="flex-1 h-12 rounded-[16px] bg-muted hover:bg-muted/80 text-foreground border-0"
                >
                  Keep Going
                </Button>
                <Button
                  onClick={handleConfirmFinish}
                  className="flex-1 h-12 rounded-[16px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0"
                >
                  Finish
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Cancel modal */}
      {portalReady &&
        showCancel &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--overlay)] backdrop-blur-sm">
            <div className="w-full sm:max-w-[430px] bg-card border-t border-border rounded-t-[28px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-foreground">Cancel workout?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Progress will be discarded and won&apos;t appear in history.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCancel(false)}
                  className="flex-1 h-12 rounded-[16px] bg-muted hover:bg-muted/80 text-foreground border-0"
                >
                  Keep Going
                </Button>
                <Button
                  onClick={handleConfirmCancel}
                  className="flex-1 h-12 rounded-[16px] bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold border-0"
                >
                  Discard
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
