'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import {
  chartSeries,
  filterReportsByRange,
  type ChartRange,
} from '@/lib/body-composition/metrics'

const RANGES: ChartRange[] = ['7d', '30d', '90d', '1y', 'all']
const RANGE_LABEL: Record<ChartRange, string> = {
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  '1y': '1Y',
  all: 'All',
}

const CHARTS: Array<{ key: keyof BodyCompositionReport; label: string; color: string }> = [
  { key: 'weight', label: 'Weight', color: 'var(--primary)' },
  { key: 'bodyFatPercent', label: 'Body Fat %', color: '#f59e0b' },
  { key: 'skeletalMuscleMass', label: 'Muscle Mass', color: '#38bdf8' },
  { key: 'bmi', label: 'BMI', color: 'var(--primary)' },
  { key: 'bmr', label: 'BMR', color: '#f59e0b' },
  { key: 'visceralFat', label: 'Visceral Fat', color: '#ef4444' },
  { key: 'bodyScore', label: 'Body Score', color: 'var(--primary)' },
]

function ChartCard({
  label,
  data,
  color,
}: {
  label: string
  data: Array<{ date: string; value: number; fullDate?: string }>
  color: string
}) {
  return (
    <div className="rounded-[20px] border border-border/60 bg-card/60 backdrop-blur-md p-3.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {data.length < 2 ? (
        <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">
          Need 2+ reports in this range
        </div>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="var(--chart-grid, hsl(var(--border)))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'var(--chart-axis, hsl(var(--muted-foreground)))' }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                width={32}
                tick={{ fontSize: 9, fill: 'var(--chart-axis, hsl(var(--muted-foreground)))' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 11,
                }}
                labelFormatter={(_, payload) => {
                  const full = payload?.[0]?.payload?.fullDate as string | undefined
                  if (!full) return ''
                  return new Date(full).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function HistoryCharts({ reports }: { reports: BodyCompositionReport[] }) {
  const [range, setRange] = useState<ChartRange>('90d')
  const filtered = useMemo(() => filterReportsByRange(reports, range), [reports, range])

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-bold cursor-pointer ${
              range === r
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {CHARTS.map((c) => (
          <ChartCard
            key={String(c.key)}
            label={c.label}
            color={c.color}
            data={chartSeries(filtered, c.key)}
          />
        ))}
      </div>
    </div>
  )
}
