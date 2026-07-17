'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buildRecoveryFromWorkouts,
  type RecoveryGroup,
} from '@/lib/muscle-recovery'
import type { CompletedWorkout } from '@/stores/historyStore'

export type MuscleTrainingRecord = {
  date: string
  volumeKg: number
}

type RecoveryState = {
  lastTrained: Partial<Record<RecoveryGroup, MuscleTrainingRecord>>
  recordSession: (
    groups: { group: RecoveryGroup; volumeKg: number }[],
    date?: string
  ) => void
  /** Rebuild recovery map from workout history (clears fatigue when history is empty). */
  rebuildFromWorkouts: (workouts: CompletedWorkout[]) => void
  reset: () => void
}

export const useRecoveryStore = create<RecoveryState>()(
  persist(
    (set) => ({
      lastTrained: {},

      recordSession: (groups, date) =>
        set((state) => {
          if (groups.length === 0) return {}
          const when = date ?? new Date().toISOString()
          const next = { ...state.lastTrained }
          for (const { group, volumeKg } of groups) {
            next[group] = { date: when, volumeKg }
          }
          return { lastTrained: next }
        }),

      rebuildFromWorkouts: (workouts) =>
        set({ lastTrained: buildRecoveryFromWorkouts(workouts) }),

      reset: () => set({ lastTrained: {} }),
    }),
    { name: 'gymtrack-recovery' }
  )
)
