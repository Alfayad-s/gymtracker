'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BodyCompositionReport } from '@/lib/body-composition/types'

type BodyCompositionState = {
  reports: BodyCompositionReport[]
  setReports: (reports: BodyCompositionReport[]) => void
  upsertReport: (report: BodyCompositionReport) => void
  removeReport: (id: string) => void
  remindersEnabled: boolean
  setRemindersEnabled: (v: boolean) => void
  lastWeeklyRemindAt: string | null
  lastMonthlyRemindAt: string | null
  setLastWeeklyRemindAt: (iso: string) => void
  setLastMonthlyRemindAt: (iso: string) => void
}

export const useBodyCompositionStore = create<BodyCompositionState>()(
  persist(
    (set) => ({
      reports: [],
      setReports: (reports) => set({ reports }),
      upsertReport: (report) =>
        set((s) => ({
          reports: [report, ...s.reports.filter((r) => r.id !== report.id)].sort(
            (a, b) =>
              new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
          ),
        })),
      removeReport: (id) =>
        set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),
      remindersEnabled: true,
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
      lastWeeklyRemindAt: null,
      lastMonthlyRemindAt: null,
      setLastWeeklyRemindAt: (lastWeeklyRemindAt) => set({ lastWeeklyRemindAt }),
      setLastMonthlyRemindAt: (lastMonthlyRemindAt) => set({ lastMonthlyRemindAt }),
    }),
    { name: 'gymtrack-body-composition' }
  )
)
