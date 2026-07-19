'use client'

import dynamic from 'next/dynamic'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import { formatReportDateTime } from '@/lib/body-composition/parse-date'
import { MetricCards } from './MetricCards'
import { ProgressCompare } from './ProgressCompare'
import { BodyDiagram } from './BodyDiagram'
import { AiAnalysisPanel } from './AiAnalysisPanel'
import { AiCoachChat } from './AiCoachChat'
import { MonthlyReportCard } from './MonthlyReportCard'
import { ReportHistoryList } from './ReportHistoryList'

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
  selectedId,
  onSelect,
  onDelete,
  onAnalysisSaved,
}: {
  reports: BodyCompositionReport[]
  selectedId: string
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onAnalysisSaved?: (id: string, analysis: string) => void
}) {
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0]
  if (!selected) return null

  const selectedIndex = reports.findIndex((r) => r.id === selected.id)
  const previous = reports[selectedIndex + 1] ?? null
  const isLatest = selectedIndex === 0

  return (
    <div className="space-y-5">
      <ReportHistoryList
        reports={reports}
        selectedId={selected.id}
        onSelect={onSelect}
        onDelete={onDelete}
      />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isLatest ? 'Latest report' : 'Selected report'}
          </p>
          <h2 className="text-lg font-bold text-foreground mt-0.5">
            {formatReportDateTime(selected.reportDate)}
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Test date from InBody report
          </p>
        </div>
      </div>

      <MetricCards report={selected} analysis={selected.aiAnalysis} />

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Segmental analysis
        </h3>
        <BodyDiagram report={selected} />
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Progress vs previous
        </h3>
        <ProgressCompare current={selected} previous={previous} />
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Trends
        </h3>
        <HistoryCharts reports={reports} />
      </section>

      <AiAnalysisPanel
        reportId={selected.id}
        initialAnalysis={selected.aiAnalysis}
        onAnalysis={(text) => onAnalysisSaved?.(selected.id, text)}
      />
      <AiCoachChat reportId={selected.id} />
      <MonthlyReportCard />
    </div>
  )
}
