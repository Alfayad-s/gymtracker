'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompletedWorkout, HistoryExercise } from '@/stores/historyStore'

export interface LoggedSet {
  id?: string
  setNumber: number
  type: 'warmup' | 'normal' | 'dropset' | 'failure'
  weight: string
  reps: number
  isCompleted: boolean
  rpe?: number
}

export interface LoggedExercise {
  exerciseId: string
  name: string
  categoryName?: string
  equipment?: string
  targetReps?: number
  restSeconds?: number
  sets: LoggedSet[]
  notes?: string
}

export interface ActiveSession {
  id: string
  name: string
  startedAt: string
  exercises: LoggedExercise[]
  notes?: string
}

type AddExerciseOptions = {
  targetSets?: number
  targetReps?: number
  restSeconds?: number
}

export type StartWorkoutExercise = {
  exerciseId: string
  name: string
  categoryName?: string
  equipment?: string
  targetSets?: number
  targetReps?: number
  restSeconds?: number
}

type WorkoutState = {
  activeSession: ActiveSession | null
  /** Start a session; pass exercises to seed them in the same atomic update. */
  startWorkout: (name: string, initialExercises?: StartWorkoutExercise[]) => void
  cancelWorkout: () => void
  finishWorkout: () => CompletedWorkout | null
  addExercise: (
    exerciseId: string,
    name: string,
    categoryName?: string,
    equipment?: string,
    options?: AddExerciseOptions
  ) => boolean
  removeExercise: (exerciseId: string) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  updateSet: (exerciseId: string, setIndex: number, fields: Partial<LoggedSet>) => void
  toggleSetCompletion: (exerciseId: string, setIndex: number) => boolean
  completeSet: (exerciseId: string, setIndex: number) => boolean
  /** Move this exercise to the end so the next one becomes current. */
  skipExercise: (exerciseId: string) => void
  /** Pull this exercise to the front of remaining work (do it now). */
  doExerciseNow: (exerciseId: string) => void
  setNotes: (notes: string) => void
  renameSession: (name: string) => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function buildLoggedExercise(
  exerciseId: string,
  name: string,
  categoryName?: string,
  equipment?: string,
  options?: AddExerciseOptions
): LoggedExercise {
  const setCount = Math.max(1, options?.targetSets ?? 3)
  const reps = options?.targetReps ?? 10
  const restSeconds = options?.restSeconds ?? 90

  return {
    exerciseId,
    name,
    categoryName,
    equipment,
    targetReps: reps,
    restSeconds,
    sets: Array.from({ length: setCount }, (_, i) => ({
      id: uid(),
      setNumber: i + 1,
      type: 'normal' as const,
      weight: '',
      reps,
      isCompleted: false,
    })),
  }
}

function setVolumeKg(setItem: LoggedSet) {
  const weight = parseFloat(setItem.weight) || 0
  return weight * (setItem.reps || 0)
}

function summarizeSession(session: ActiveSession): CompletedWorkout {
  const completedAt = new Date().toISOString()
  const durationMs = Math.max(0, Date.now() - new Date(session.startedAt).getTime())
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000))

  const exercises: HistoryExercise[] = session.exercises.map((ex) => {
    const done = ex.sets.filter((s) => s.isCompleted)
    let best: LoggedSet | null = null
    for (const s of done) {
      if (!best || setVolumeKg(s) > setVolumeKg(best)) best = s
    }
    const loggedSets = done.map((s) => ({
      setNumber: s.setNumber,
      weight: parseFloat(s.weight) || 0,
      reps: s.reps || 0,
    }))
    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: done.length,
      volumeKg: done.reduce((sum, s) => sum + setVolumeKg(s), 0),
      bestSet: best ? `${best.weight || 0} kg × ${best.reps}` : undefined,
      loggedSets,
    }
  })

  const volumeKg = exercises.reduce((sum, e) => sum + e.volumeKg, 0)
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0)

  return {
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    completedAt,
    durationMinutes,
    volumeKg: Math.round(volumeKg),
    totalSets,
    exercises: exercises.filter((e) => e.sets > 0),
  }
}

export function getSessionStats(session: ActiveSession | null) {
  if (!session) {
    return { completedSets: 0, totalSets: 0, volumeKg: 0, progressPct: 0 }
  }
  let completedSets = 0
  let totalSets = 0
  let volumeKg = 0
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      totalSets += 1
      if (s.isCompleted) {
        completedSets += 1
        volumeKg += setVolumeKg(s)
      }
    }
  }
  return {
    completedSets,
    totalSets,
    volumeKg: Math.round(volumeKg),
    progressPct: totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100),
  }
}

export function getSetContext(
  session: ActiveSession,
  exerciseId: string,
  setIndex: number
) {
  const exerciseIndex = session.exercises.findIndex((e) => e.exerciseId === exerciseId)
  if (exerciseIndex < 0) return null
  const exercise = session.exercises[exerciseIndex]
  const set = exercise.sets[setIndex]
  if (!set) return null
  return {
    exerciseIndex,
    exerciseCount: session.exercises.length,
    setIndex,
    setCount: exercise.sets.length,
    exercise,
    set,
  }
}

export function findNextIncompleteSet(
  session: ActiveSession,
  fromExerciseId?: string,
  fromSetIndex?: number
): { exerciseId: string; setIndex: number } | null {
  const exercises = session.exercises
  let startEx = 0
  let startSet = 0

  if (fromExerciseId != null && fromSetIndex != null) {
    const idx = exercises.findIndex((e) => e.exerciseId === fromExerciseId)
    if (idx >= 0) {
      startEx = idx
      startSet = fromSetIndex + 1
    }
  }

  for (let ei = startEx; ei < exercises.length; ei++) {
    const sets = exercises[ei].sets
    const from = ei === startEx ? startSet : 0
    for (let si = from; si < sets.length; si++) {
      if (!sets[si].isCompleted) {
        return { exerciseId: exercises[ei].exerciseId, setIndex: si }
      }
    }
  }

  // wrap: any incomplete earlier
  for (let ei = 0; ei < exercises.length; ei++) {
    for (let si = 0; si < exercises[ei].sets.length; si++) {
      if (!exercises[ei].sets[si].isCompleted) {
        return { exerciseId: exercises[ei].exerciseId, setIndex: si }
      }
    }
  }

  return null
}

/** Upcoming exercises that still have incomplete sets (excluding the current one). */
export function getUpcomingExercises(
  session: ActiveSession,
  currentExerciseId?: string
): LoggedExercise[] {
  return session.exercises.filter((ex) => {
    if (currentExerciseId && ex.exerciseId === currentExerciseId) return false
    return ex.sets.some((s) => !s.isCompleted)
  })
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeSession: null,

      startWorkout: (name, initialExercises = []) => {
        const seen = new Set<string>()
        const exercises: LoggedExercise[] = []
        for (const ex of initialExercises) {
          if (!ex.exerciseId || seen.has(ex.exerciseId)) continue
          seen.add(ex.exerciseId)
          exercises.push(
            buildLoggedExercise(ex.exerciseId, ex.name, ex.categoryName, ex.equipment, {
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
            })
          )
        }

        set({
          activeSession: {
            id: uid(),
            name,
            startedAt: new Date().toISOString(),
            exercises,
          },
        })
      },

      cancelWorkout: () => set({ activeSession: null }),

      finishWorkout: () => {
        const session = get().activeSession
        if (!session) return null
        const summary = summarizeSession(session)
        set({ activeSession: null })
        return summary
      },

      addExercise: (exerciseId, name, categoryName, equipment, options) => {
        const session = get().activeSession
        if (!session) return false
        if (session.exercises.some((e) => e.exerciseId === exerciseId)) return true

        set({
          activeSession: {
            ...session,
            exercises: [
              ...session.exercises,
              buildLoggedExercise(exerciseId, name, categoryName, equipment, options),
            ],
          },
        })
        return true
      },

      removeExercise: (exerciseId) =>
        set((state) => {
          if (!state.activeSession) return {}
          return {
            activeSession: {
              ...state.activeSession,
              exercises: state.activeSession.exercises.filter((e) => e.exerciseId !== exerciseId),
            },
          }
        }),

      addSet: (exerciseId) =>
        set((state) => {
          if (!state.activeSession) return {}
          const exercises = state.activeSession.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e
            const lastSet = e.sets[e.sets.length - 1]
            return {
              ...e,
              sets: [
                ...e.sets,
                {
                  id: uid(),
                  setNumber: e.sets.length + 1,
                  type: 'normal' as const,
                  weight: lastSet?.weight ?? '',
                  reps: lastSet?.reps ?? e.targetReps ?? 0,
                  isCompleted: false,
                },
              ],
            }
          })
          return { activeSession: { ...state.activeSession, exercises } }
        }),

      removeSet: (exerciseId, setIndex) =>
        set((state) => {
          if (!state.activeSession) return {}
          const exercises = state.activeSession.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e
            if (e.sets.length <= 1) return e
            const sets = e.sets
              .filter((_, idx) => idx !== setIndex)
              .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
            return { ...e, sets }
          })
          return { activeSession: { ...state.activeSession, exercises } }
        }),

      updateSet: (exerciseId, setIndex, fields) =>
        set((state) => {
          if (!state.activeSession) return {}
          const exercises = state.activeSession.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e
            return {
              ...e,
              sets: e.sets.map((s, idx) => (idx === setIndex ? { ...s, ...fields } : s)),
            }
          })
          return { activeSession: { ...state.activeSession, exercises } }
        }),

      toggleSetCompletion: (exerciseId, setIndex) => {
        const session = get().activeSession
        if (!session) return false
        const exercise = session.exercises.find((e) => e.exerciseId === exerciseId)
        const setItem = exercise?.sets[setIndex]
        if (!setItem) return false
        const willComplete = !setItem.isCompleted

        set((state) => {
          if (!state.activeSession) return {}
          const exercises = state.activeSession.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e
            return {
              ...e,
              sets: e.sets.map((s, idx) =>
                idx === setIndex ? { ...s, isCompleted: !s.isCompleted } : s
              ),
            }
          })
          return { activeSession: { ...state.activeSession, exercises } }
        })

        return willComplete
      },

      completeSet: (exerciseId, setIndex) => {
        const session = get().activeSession
        if (!session) return false
        const exercise = session.exercises.find((e) => e.exerciseId === exerciseId)
        const setItem = exercise?.sets[setIndex]
        if (!setItem || setItem.isCompleted) return false

        const completedWeight = setItem.weight
        const completedReps = setItem.reps

        set((state) => {
          if (!state.activeSession) return {}
          const exercises = state.activeSession.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e
            const sets = e.sets.map((s, idx) => {
              if (idx === setIndex) return { ...s, isCompleted: true }
              // Prefill next set with values from the one just completed
              if (idx === setIndex + 1 && !s.weight && completedWeight) {
                return { ...s, weight: completedWeight, reps: completedReps || s.reps }
              }
              return s
            })
            return { ...e, sets }
          })
          return { activeSession: { ...state.activeSession, exercises } }
        })

        return true
      },

      skipExercise: (exerciseId) =>
        set((state) => {
          if (!state.activeSession) return {}
          const exercises = [...state.activeSession.exercises]
          const fromIdx = exercises.findIndex((e) => e.exerciseId === exerciseId)
          if (fromIdx < 0) return {}
          // Already last with nothing after that has work? still move to end is fine
          const [item] = exercises.splice(fromIdx, 1)
          exercises.push(item)
          return {
            activeSession: { ...state.activeSession, exercises },
          }
        }),

      doExerciseNow: (exerciseId) =>
        set((state) => {
          if (!state.activeSession) return {}
          const exercises = [...state.activeSession.exercises]
          const fromIdx = exercises.findIndex((e) => e.exerciseId === exerciseId)
          if (fromIdx < 0) return {}

          const next = findNextIncompleteSet(state.activeSession)
          const toIdx = next
            ? exercises.findIndex((e) => e.exerciseId === next.exerciseId)
            : 0
          if (toIdx < 0 || fromIdx === toIdx) return {}

          const [item] = exercises.splice(fromIdx, 1)
          const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx
          exercises.splice(Math.max(0, insertAt), 0, item)

          return {
            activeSession: { ...state.activeSession, exercises },
          }
        }),

      setNotes: (notes) =>
        set((state) => {
          if (!state.activeSession) return {}
          return { activeSession: { ...state.activeSession, notes } }
        }),

      renameSession: (name) =>
        set((state) => {
          if (!state.activeSession) return {}
          return { activeSession: { ...state.activeSession, name } }
        }),
    }),
    { name: 'gymtrack-active-workout' }
  )
)
