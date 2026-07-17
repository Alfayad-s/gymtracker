'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BodyWeightEntry = {
  id: string
  date: string
  weight: number
}

type ProgressState = {
  bodyWeightLog: BodyWeightEntry[]
  goalWeight: number | null
  addBodyWeight: (weight: number, date?: string) => void
  removeBodyWeight: (id: string) => void
  setGoalWeight: (weight: number | null) => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      bodyWeightLog: [],
      goalWeight: null,

      addBodyWeight: (weight, date) =>
        set((state) => ({
          bodyWeightLog: [
            {
              id: uid(),
              date: date ?? new Date().toISOString(),
              weight,
            },
            ...state.bodyWeightLog,
          ].slice(0, 365),
        })),

      removeBodyWeight: (id) =>
        set((state) => ({
          bodyWeightLog: state.bodyWeightLog.filter((e) => e.id !== id),
        })),

      setGoalWeight: (weight) => set({ goalWeight: weight }),
    }),
    { name: 'gymtrack-progress' }
  )
)

export type BodyWeightStats = {
  current: number | null
  previous: number | null
  weeklyChange: number | null
  totalChange: number | null
  toGoal: number | null
}

/** Derives current weight, weekly change, and distance to goal from the log. */
export function computeBodyWeightStats(
  log: BodyWeightEntry[],
  goalWeight: number | null
): BodyWeightStats {
  if (log.length === 0) {
    return {
      current: null,
      previous: null,
      weeklyChange: null,
      totalChange: null,
      toGoal: null,
    }
  }

  const sorted = [...log].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const current = sorted[0]
  const oldest = sorted[sorted.length - 1]

  // Find the entry closest to 7 days before the latest entry
  const weekAgo = new Date(current.date).getTime() - 7 * 24 * 60 * 60 * 1000
  let baseline: BodyWeightEntry | null = null
  for (const entry of sorted) {
    if (entry.id === current.id) continue
    if (new Date(entry.date).getTime() <= weekAgo) {
      baseline = entry
      break
    }
  }
  // Fall back to the previous entry if none is 7+ days old
  if (!baseline) {
    baseline = sorted.find((e) => e.id !== current.id) ?? null
  }

  return {
    current: current.weight,
    previous: baseline?.weight ?? null,
    weeklyChange: baseline ? current.weight - baseline.weight : null,
    totalChange: sorted.length > 1 ? current.weight - oldest.weight : null,
    toGoal: goalWeight != null ? current.weight - goalWeight : null,
  }
}
