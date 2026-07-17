'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TimerState {
  secondsRemaining: number
  isActive: boolean
  duration: number
  justFinished: boolean
  /** Unix ms deadline when the rest timer should end. Null when idle/paused. */
  endsAt: number | null
  startTimer: (durationSeconds?: number) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  adjustTimer: (deltaSeconds: number) => void
  setDuration: (duration: number) => void
  clearFinished: () => void
  /** Recompute remaining time from endsAt (background-safe). */
  syncTimer: () => void
  /** @deprecated Prefer syncTimer — kept as alias for callers. */
  tick: () => void
}

function remainingFromEndsAt(endsAt: number | null, isActive: boolean): number {
  if (!isActive || endsAt == null) return 0
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      secondsRemaining: 0,
      isActive: false,
      duration: 90,
      justFinished: false,
      endsAt: null,

      startTimer: (durationSeconds) => {
        const targetDuration = Math.max(5, durationSeconds ?? get().duration)
        const endsAt = Date.now() + targetDuration * 1000
        set({
          secondsRemaining: targetDuration,
          duration: targetDuration,
          isActive: true,
          justFinished: false,
          endsAt,
        })
      },

      pauseTimer: () => {
        const { endsAt, isActive } = get()
        if (!isActive || endsAt == null) {
          set({ isActive: false })
          return
        }
        const remaining = remainingFromEndsAt(endsAt, true)
        set({
          isActive: false,
          endsAt: null,
          secondsRemaining: remaining,
        })
      },

      resumeTimer: () => {
        const { secondsRemaining } = get()
        if (secondsRemaining <= 0) return
        set({
          isActive: true,
          justFinished: false,
          endsAt: Date.now() + secondsRemaining * 1000,
        })
      },

      stopTimer: () =>
        set({
          isActive: false,
          secondsRemaining: 0,
          justFinished: false,
          endsAt: null,
        }),

      adjustTimer: (deltaSeconds) => {
        const state = get()
        const currentRemaining = state.isActive
          ? remainingFromEndsAt(state.endsAt, true) || state.secondsRemaining
          : state.secondsRemaining
        const next = Math.max(0, currentRemaining + deltaSeconds)

        if (next === 0) {
          set({
            secondsRemaining: 0,
            endsAt: null,
            isActive: false,
            justFinished: state.secondsRemaining > 0 || state.isActive,
            duration: Math.max(state.duration, currentRemaining),
          })
          return
        }

        set({
          secondsRemaining: next,
          duration: Math.max(state.duration, next),
          isActive: true,
          justFinished: false,
          endsAt: Date.now() + next * 1000,
        })
      },

      setDuration: (duration) => set({ duration: Math.max(5, duration) }),

      clearFinished: () => set({ justFinished: false }),

      syncTimer: () => {
        const state = get()
        if (!state.isActive || state.endsAt == null) return

        const remaining = remainingFromEndsAt(state.endsAt, true)
        if (remaining <= 0) {
          set({
            secondsRemaining: 0,
            isActive: false,
            endsAt: null,
            justFinished: true,
          })
          return
        }

        if (remaining !== state.secondsRemaining) {
          set({ secondsRemaining: remaining })
        }
      },

      tick: () => get().syncTimer(),
    }),
    {
      name: 'gymtrack-rest-timer',
      partialize: (state) => ({
        secondsRemaining: state.secondsRemaining,
        isActive: state.isActive,
        duration: state.duration,
        justFinished: state.justFinished,
        endsAt: state.endsAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.syncTimer()
      },
    }
  )
)
