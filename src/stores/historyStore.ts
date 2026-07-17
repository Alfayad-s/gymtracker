'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useRecoveryStore } from '@/stores/recoveryStore'

export type HistorySet = {
  setNumber: number
  weight: number
  reps: number
}

export type HistoryExercise = {
  exerciseId: string
  name: string
  sets: number
  volumeKg: number
  bestSet?: string
  loggedSets?: HistorySet[]
}

export type CompletedWorkout = {
  id: string
  name: string
  startedAt: string
  completedAt: string
  durationMinutes: number
  volumeKg: number
  totalSets: number
  exercises: HistoryExercise[]
}

type HistoryState = {
  workouts: CompletedWorkout[]
  addWorkout: (workout: CompletedWorkout) => void
  removeWorkout: (id: string) => void
  clearHistory: () => void
  getWorkout: (id: string) => CompletedWorkout | undefined
}

function syncRecovery(workouts: CompletedWorkout[]) {
  useRecoveryStore.getState().rebuildFromWorkouts(workouts)
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      workouts: [],

      addWorkout: (workout) => {
        set((state) => {
          const workouts = [workout, ...state.workouts].slice(0, 200)
          queueMicrotask(() => syncRecovery(workouts))
          return { workouts }
        })
      },

      removeWorkout: (id) => {
        set((state) => {
          const workouts = state.workouts.filter((w) => w.id !== id)
          queueMicrotask(() => syncRecovery(workouts))
          return { workouts }
        })
      },

      clearHistory: () => {
        set({ workouts: [] })
        queueMicrotask(() => syncRecovery([]))
      },

      getWorkout: (id) => get().workouts.find((w) => w.id === id),
    }),
    { name: 'gymtrack-history' }
  )
)
