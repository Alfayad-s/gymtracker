'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ScanLine, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useBodyCompositionStore } from '@/stores/bodyCompositionStore'
import type { BodyCompositionExtract } from '@/lib/body-composition/types'
import { computeDeltas } from '@/lib/body-composition/metrics'
import { UploadZone } from '@/components/body-composition/UploadZone'
import { ReportDashboard } from '@/components/body-composition/ReportDashboard'
import { Button } from '@/components/ui/button'
import {
  notifyBodyComposition,
  requestNotificationPermission,
} from '@/lib/notifications'

export default function BodyCompositionPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const reports = useBodyCompositionStore((s) => s.reports)
  const setReports = useBodyCompositionStore((s) => s.setReports)
  const upsertReport = useBodyCompositionStore((s) => s.upsertReport)
  const removeReport = useBodyCompositionStore((s) => s.removeReport)
  const remindersEnabled = useBodyCompositionStore((s) => s.remindersEnabled)
  const setRemindersEnabled = useBodyCompositionStore((s) => s.setRemindersEnabled)
  const lastWeeklyRemindAt = useBodyCompositionStore((s) => s.lastWeeklyRemindAt)
  const lastMonthlyRemindAt = useBodyCompositionStore((s) => s.lastMonthlyRemindAt)
  const setLastWeeklyRemindAt = useBodyCompositionStore((s) => s.setLastWeeklyRemindAt)
  const setLastMonthlyRemindAt = useBodyCompositionStore((s) => s.setLastMonthlyRemindAt)

  const [loadingList, setLoadingList] = useState(false)
  const [uploaded, setUploaded] = useState<{
    url: string
    kind: 'image' | 'pdf'
    fileName: string
  } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<BodyCompositionExtract | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoadingList(true)
    try {
      const res = await fetch('/api/body-composition/reports')
      const data = (await res.json().catch(() => ({}))) as {
        reports?: typeof reports
        error?: string
      }
      if (res.ok && data.reports) setReports(data.reports)
    } finally {
      setLoadingList(false)
    }
  }, [user, setReports])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Weekly / monthly local reminders
  useEffect(() => {
    if (!remindersEnabled || typeof window === 'undefined') return
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const monthMs = 30 * 24 * 60 * 60 * 1000
    const lastW = lastWeeklyRemindAt ? new Date(lastWeeklyRemindAt).getTime() : 0
    const lastM = lastMonthlyRemindAt ? new Date(lastMonthlyRemindAt).getTime() : 0

    if (now - lastW > weekMs) {
      void requestNotificationPermission().then(() => {
        notifyBodyComposition(
          'Weekly body check-in',
          'Upload a fresh InBody scan to track composition this week.'
        )
      })
      setLastWeeklyRemindAt(new Date().toISOString())
    }
    if (now - lastM > monthMs) {
      void requestNotificationPermission().then(() => {
        notifyBodyComposition(
          'Monthly body composition',
          'Generate your monthly AI summary on the Body Composition page.'
        )
      })
      setLastMonthlyRemindAt(new Date().toISOString())
    }
  }, [
    remindersEnabled,
    lastWeeklyRemindAt,
    lastMonthlyRemindAt,
    setLastWeeklyRemindAt,
    setLastMonthlyRemindAt,
  ])

  const analyze = async () => {
    if (!uploaded || !user) return
    setAnalyzing(true)
    setError(null)
    setDraft(null)
    try {
      const res = await fetch('/api/body-composition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: uploaded.url, kind: uploaded.kind }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        report?: BodyCompositionExtract
        rawText?: string
        error?: string
      }
      if (!res.ok || !data.report) throw new Error(data.error || 'Analyze failed')
      setDraft(data.report)
      setRawText(data.rawText ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyze failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const save = async () => {
    if (!draft || !uploaded || !user) return
    setSaving(true)
    setError(null)
    try {
      const previous = reports[0] ?? null
      const res = await fetch('/api/body-composition/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extract: draft,
          pdfUrl: uploaded.kind === 'pdf' ? uploaded.url : null,
          imageUrl: uploaded.kind === 'image' ? uploaded.url : null,
          rawText,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        report?: (typeof reports)[0]
        error?: string
      }
      if (!res.ok || !data.report) throw new Error(data.error || 'Save failed')

      upsertReport(data.report)
      void requestNotificationPermission().then(() => {
        notifyBodyComposition(
          'New report analyzed',
          'Your body composition report is ready.'
        )
        if (previous) {
          const deltas = computeDeltas(data.report!, previous)
          const improved = deltas.filter((d) => d.direction === 'improved')
          for (const d of improved.slice(0, 3)) {
            notifyBodyComposition(`${d.label} improved`, `Change: ${d.delta}`)
          }
        }
      })

      setDraft(null)
      setUploaded(null)
      setRawText(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/body-composition/reports/${id}`, { method: 'DELETE' })
    if (res.ok) removeReport(id)
  }

  return (
    <div className="p-5 space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Body Composition
          </h1>
          <p className="text-xs text-muted-foreground">
            Upload InBody / BIA reports · AI extract · track progress
          </p>
        </div>
      </div>

      {!user ? (
        <div className="rounded-[24px] border border-dashed border-border p-8 text-center space-y-3">
          <ScanLine className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <p className="text-sm font-bold text-foreground">Sign in required</p>
          <p className="text-xs text-muted-foreground">
            Log in to upload and sync body composition reports.
          </p>
          <Button
            type="button"
            onClick={() => router.push('/login')}
            className="h-11 px-5 rounded-[14px] bg-primary text-primary-foreground font-bold border-0"
          >
            Sign in
          </Button>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Upload report
              </h2>
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  className="rounded border-border"
                />
                Reminders
              </label>
            </div>
            <UploadZone
              onUploaded={(payload) => {
                setUploaded(payload)
                setDraft(null)
                setError(null)
              }}
            />
            {uploaded && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={analyzing}
                  onClick={() => void analyze()}
                  className="flex-1 h-11 rounded-[14px] bg-primary text-primary-foreground font-bold border-0 flex items-center justify-center gap-1.5"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {analyzing ? 'Analyzing…' : 'Analyze with AI'}
                </Button>
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {draft && (
              <div className="rounded-[20px] border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="text-xs font-bold text-foreground">Review extracted metrics</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {(
                    [
                      ['Weight', draft.weight, 'kg'],
                      ['Body Fat %', draft.bodyFatPercent, '%'],
                      ['Muscle', draft.skeletalMuscleMass, 'kg'],
                      ['BMI', draft.bmi, ''],
                      ['Score', draft.bodyScore, ''],
                      ['BMR', draft.bmr, 'kcal'],
                    ] as const
                  ).map(([label, value, unit]) => (
                    <div
                      key={label}
                      className="rounded-[12px] bg-background/60 border border-border px-2.5 py-2"
                    >
                      <p className="text-muted-foreground">{label}</p>
                      <p className="font-bold text-foreground tabular-nums">
                        {value == null ? '—' : `${value}${unit ? ` ${unit}` : ''}`}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold border-0"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save report'}
                </Button>
              </div>
            )}
          </section>

          {loadingList && reports.length === 0 ? (
            <div className="space-y-3 animate-pulse" aria-busy>
              <div className="h-28 rounded-[24px] bg-muted/70" />
              <div className="h-40 rounded-[24px] bg-muted/70" />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border p-8 text-center space-y-2">
              <ScanLine className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
              <p className="text-sm font-bold text-foreground">Upload your first InBody report</p>
              <p className="text-xs text-muted-foreground">
                Photos or PDFs work. AI will extract metrics automatically.
              </p>
            </div>
          ) : (
            <ReportDashboard
              reports={reports}
              onDelete={(id) => void handleDelete(id)}
              onAnalysisSaved={(id, analysis) => {
                const found = reports.find((r) => r.id === id)
                if (found) upsertReport({ ...found, aiAnalysis: analysis })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
