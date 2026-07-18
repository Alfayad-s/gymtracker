'use client'

import { useState } from 'react'
import { CalendarRange, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnalysisSections } from './AnalysisSections'

export function MonthlyReportCard() {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/body-composition/ai/monthly', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as {
        report?: string
        error?: string
      }
      if (!res.ok || !data.report) throw new Error(data.error || 'Failed')
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/60 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sky-500">
          <CalendarRange className="w-4 h-4" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider">Monthly Report</h3>
        </div>
        <Button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="h-9 px-3 rounded-[12px] bg-sky-500/15 text-sky-500 border border-sky-500/25 text-xs font-bold"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Generate'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {report ? (
        <AnalysisSections text={report} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Summarize the last 30 days of body composition progress.
        </p>
      )}
    </div>
  )
}
