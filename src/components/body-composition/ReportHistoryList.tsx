'use client'

import { FileText, Trash2 } from 'lucide-react'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import { formatReportDateTime } from '@/lib/body-composition/parse-date'

export function ReportHistoryList({
  reports,
  selectedId,
  onSelect,
  onDelete,
}: {
  reports: BodyCompositionReport[]
  selectedId: string
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (reports.length === 0) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Uploaded reports
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {reports.length} total
        </span>
      </div>

      <ul className="space-y-2">
        {reports.map((report, index) => {
          const selected = report.id === selectedId
          const weight = report.weight
          const fat = report.bodyFatPercent
          return (
            <li key={report.id}>
              <div
                className={`flex items-stretch gap-1 rounded-[16px] border transition-colors ${
                  selected
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(report.id)}
                  className="flex flex-1 items-center gap-3 px-3.5 py-3 text-left cursor-pointer active:scale-[0.99]"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                      selected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">
                        {formatReportDateTime(report.reportDate)}
                      </p>
                      {index === 0 && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                      {weight != null ? `${weight} kg` : '—'}
                      {' · '}
                      {fat != null ? `${fat}% fat` : '— fat'}
                      {report.skeletalMuscleMass != null
                        ? ` · ${report.skeletalMuscleMass} kg muscle`
                        : ''}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Delete this InBody report? This cannot be undone and will remove it from history charts.'
                      )
                    ) {
                      onDelete(report.id)
                    }
                  }}
                  className="shrink-0 px-3.5 text-destructive hover:bg-destructive/10 cursor-pointer rounded-r-[16px]"
                  aria-label={`Delete report from ${formatReportDateTime(report.reportDate)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
