'use client'

import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import { MetricCards } from './MetricCards'
import { ProgressCompare } from './ProgressCompare'
import { BodyDiagram } from './BodyDiagram'
import { AiAnalysisPanel } from './AiAnalysisPanel'
import { AiCoachChat } from './AiCoachChat'
import { MonthlyReportCard } from './MonthlyReportCard'

const HistoryCharts = dynamic(
  () => import('./HistoryCharts').then((m) => m.HistoryCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-[20px] bg-muted/60 animate-pulse" aria-busy />
    ),
  }
)

export function ReportDashboard({
  reports,
  onDelete,
  onAnalysisSaved,
}: {
  reports: BodyCompositionReport[]
  onDelete: (id: string) => void
  onAnalysisSaved?: (id: string, analysis: string) => void
}) {
  const current = reports[0]
  const previous = reports[1] ?? null
  if (!current) return null

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Latest report
          </p>
          <h2 className="text-lg font-bold text-foreground mt-0.5">
            {format(new Date(current.reportDate), 'MMM d, yyyy')}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Delete this report?')) onDelete(current.id)
          }}
          className="p-2 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
          aria-label="Delete report"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <MetricCards report={current} analysis={current.aiAnalysis} />

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Segmental analysis
        </h3>
        <BodyDiagram report={current} />
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Progress vs previous
        </h3>
        <ProgressCompare current={current} previous={previous} />
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          History
        </h3>
        <HistoryCharts reports={reports} />
      </section>

      <AiAnalysisPanel
        reportId={current.id}
        initialAnalysis={current.aiAnalysis}
        onAnalysis={(text) => onAnalysisSaved?.(current.id, text)}
      />
      <AiCoachChat reportId={current.id} />
      <MonthlyReportCard />
    </div>
  )
}
