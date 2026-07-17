'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import maleFront from './data/male-front.json'
import maleBack from './data/male-back.json'
import {
  type BodyPathSet,
  type MuscleHighlights,
  type MuscleId,
  MUSCLE_LABELS,
} from './types'

const DATASETS: Record<'front' | 'back', BodyPathSet> = {
  front: maleFront as BodyPathSet,
  back: maleBack as BodyPathSet,
}

const COSMETIC = new Set(['head', 'hair', 'hands', 'feet', 'ankles', 'knees'])

type MuscleMapProps = {
  view?: 'front' | 'back'
  highlights?: MuscleHighlights
  /** Muscle slug(s) currently selected — drawn with a strong outline for mobile feedback. */
  selected?: string | readonly string[] | null
  defaultFill?: string
  stroke?: string
  strokeWidth?: number
  className?: string
  interactive?: boolean
  onMuscleClick?: (muscle: string) => void
}

function resolveHighlight(
  slug: string,
  highlights?: MuscleHighlights
): { color: string; opacity: number } | null {
  const entry = highlights?.[slug]
  if (!entry) return null
  if (typeof entry === 'string') return { color: entry, opacity: 0.95 }
  return { color: entry.color, opacity: entry.opacity ?? 0.95 }
}

function toSelectedSet(selected?: string | readonly string[] | null): Set<string> {
  if (!selected) return new Set()
  if (typeof selected === 'string') return new Set([selected])
  return new Set(selected)
}

export function MuscleMap({
  view = 'front',
  highlights,
  selected = null,
  defaultFill = 'var(--muscle-default)',
  stroke = 'var(--muscle-stroke)',
  strokeWidth = 1.2,
  className,
  interactive = true,
  onMuscleClick,
}: MuscleMapProps) {
  const dataset = DATASETS[view]
  const { x, y, width, height } = dataset.viewBox

  const parts = useMemo(() => dataset.parts, [dataset])
  const selectedSet = useMemo(() => toSelectedSet(selected), [selected])

  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      className={cn('muscle-map w-full h-auto select-none touch-manipulation', className)}
      role="img"
      aria-label={`Male ${view} body muscle map`}
    >
      {parts.map((part) => {
        const isCosmetic = COSMETIC.has(part.slug)
        const highlight = resolveHighlight(part.slug, highlights)
        const isSelected = selectedSet.has(part.slug)
        const fill =
          highlight?.color ?? (part.slug === 'hair' ? 'var(--muscle-stroke)' : defaultFill)
        const opacity = isSelected
          ? 1
          : (highlight?.opacity ?? (part.slug === 'hair' ? 1 : isCosmetic ? 0.85 : 1))
        const paths = [...part.common, ...part.left, ...part.right]
        const label = MUSCLE_LABELS[part.slug] ?? part.slug
        const clickable = interactive && !isCosmetic && !!onMuscleClick
        const partStroke = isSelected ? 'var(--primary)' : stroke
        const partStrokeWidth = isSelected ? strokeWidth + 2.4 : strokeWidth

        return (
          <g
            key={part.slug}
            data-muscle={part.slug}
            data-selected={isSelected ? 'true' : undefined}
            opacity={opacity}
            onClick={clickable ? () => onMuscleClick?.(part.slug) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onMuscleClick?.(part.slug)
                    }
                  }
                : undefined
            }
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={label}
            aria-pressed={clickable ? isSelected : undefined}
            className={cn(
              'transition-[filter,opacity] duration-150',
              clickable && 'cursor-pointer outline-none',
              clickable && !isSelected && 'active:brightness-125',
              isSelected && 'brightness-110'
            )}
            style={{
              outline: 'none',
              filter: isSelected
                ? 'drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 70%, transparent))'
                : undefined,
            }}
          >
            {paths.map((d, i) => (
              <path
                key={`${part.slug}-${i}`}
                d={d}
                fill={fill}
                stroke={partStroke}
                strokeWidth={partStrokeWidth}
                strokeLinejoin="round"
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export type { MuscleId, MuscleHighlights }
