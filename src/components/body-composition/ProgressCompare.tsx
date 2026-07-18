'use client'

import { motion } from 'framer-motion'
import type { BodyCompositionReport } from '@/lib/body-composition/types'
import { computeDeltas } from '@/lib/body-composition/metrics'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

export function ProgressCompare({
  current,
  previous,
}: {
  current: BodyCompositionReport
  previous: BodyCompositionReport | null
}) {
  if (!previous) {
    return (
      <div className="rounded-[20px] border border-dashed border-border p-5 text-center">
        <p className="text-sm font-bold text-foreground">No previous report yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload another scan to unlock progress comparison.
        </p>
      </div>
    )
  }

  const deltas = computeDeltas(current, previous)

  return (
    <div className="space-y-2.5">
      {deltas.map((d, i) => (
        <motion.div
          key={d.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-[16px] border border-border/60 bg-card/50 backdrop-blur px-3.5 py-3 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-xs font-bold text-foreground">{d.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              {d.previous ?? '—'} → {d.current ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold tabular-nums ${
                d.direction === 'improved'
                  ? 'text-primary'
                  : d.direction === 'declined'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }`}
            >
              {d.delta == null
                ? '—'
                : `${d.delta > 0 ? '+' : ''}${d.delta}`}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                d.direction === 'improved'
                  ? 'bg-primary/15 text-primary'
                  : d.direction === 'declined'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {d.direction === 'improved' &&
                (d.delta != null && d.delta < 0 ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <ArrowUpRight className="w-3 h-3" />
                ))}
              {d.direction === 'declined' &&
                (d.delta != null && d.delta > 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                ))}
              {d.direction === 'unchanged' && <Minus className="w-3 h-3" />}
              {d.direction === 'improved'
                ? 'Improved'
                : d.direction === 'declined'
                  ? 'Declined'
                  : 'No Change'}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
