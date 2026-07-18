'use client'

import { useState } from 'react'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import { segmentStatuses, STATUS_COLOR, type SegmentKey } from '@/lib/body-composition/segment-status'
import { formatMetric } from '@/lib/body-composition/metrics'

export function BodyDiagram({ report }: { report: BodyCompositionReport }) {
  const statuses = segmentStatuses(report.segmentalLean, report.segmentalFat)
  const [selected, setSelected] = useState<SegmentKey | null>('trunk')
  const active = selected ? statuses[selected] : null

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/60 backdrop-blur-md p-4 space-y-4">
      <div className="flex justify-center">
        <svg viewBox="0 0 200 420" className="w-[180px] max-h-[320px]" aria-label="Body segments">
          {/* Head */}
          <ellipse cx="100" cy="36" rx="28" ry="34" fill="var(--muted)" opacity={0.5} />
          {/* Trunk */}
          <path
            d="M62 78 L138 78 L148 210 L52 210 Z"
            fill={STATUS_COLOR[statuses.trunk.status]}
            opacity={0.85}
            className="cursor-pointer"
            onClick={() => setSelected('trunk')}
          />
          {/* Arms */}
          <path
            d="M62 82 L38 88 L22 190 L44 194 L62 120 Z"
            fill={STATUS_COLOR[statuses.leftArm.status]}
            opacity={0.9}
            className="cursor-pointer"
            onClick={() => setSelected('leftArm')}
          />
          <path
            d="M138 82 L162 88 L178 190 L156 194 L138 120 Z"
            fill={STATUS_COLOR[statuses.rightArm.status]}
            opacity={0.9}
            className="cursor-pointer"
            onClick={() => setSelected('rightArm')}
          />
          {/* Legs */}
          <path
            d="M52 210 L92 210 L88 390 L58 390 Z"
            fill={STATUS_COLOR[statuses.leftLeg.status]}
            opacity={0.9}
            className="cursor-pointer"
            onClick={() => setSelected('leftLeg')}
          />
          <path
            d="M108 210 L148 210 L142 390 L112 390 Z"
            fill={STATUS_COLOR[statuses.rightLeg.status]}
            opacity={0.9}
            className="cursor-pointer"
            onClick={() => setSelected('rightLeg')}
          />
        </svg>
      </div>

      <div className="flex items-center justify-center gap-4 text-[10px] font-medium">
        <span className="flex items-center gap-1.5 text-primary">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Normal
        </span>
        <span className="flex items-center gap-1.5 text-warning">
          <span className="w-2 h-2 rounded-full bg-[#eab308]" /> Low lean
        </span>
        <span className="flex items-center gap-1.5 text-destructive">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> High fat
        </span>
      </div>

      {active && (
        <div className="rounded-[16px] bg-background/50 border border-border px-4 py-3 text-center">
          <p className="text-sm font-bold text-foreground">{active.label}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Lean {formatMetric(active.lean, ' kg')} · Fat {formatMetric(active.fat, ' kg')}
          </p>
        </div>
      )}
    </div>
  )
}
