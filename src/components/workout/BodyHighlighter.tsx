'use client'

import { MuscleMap } from '@/components/muscle-map'
import {
  WORKOUT_MUSCLES,
  highlightsFromMuscles,
  type MuscleHighlights,
  type WorkoutFocus,
} from '@/components/muscle-map'
import { cn } from '@/lib/utils'

type BodyHighlighterProps = {
  /** Workout focus shortcut, e.g. "legs-abs" | "chest" | "back" */
  focus?: WorkoutFocus
  /** Explicit muscle ids to highlight */
  muscles?: readonly string[]
  /** Full highlight map with per-muscle colors */
  highlights?: MuscleHighlights
  view?: 'front' | 'back'
  highlightColor?: string
  defaultFill?: string
  className?: string
  interactive?: boolean
  onMuscleClick?: (muscle: string) => void
}

/**
 * Thin wrapper around MuscleMap (SVG anatomy from MuscleMap / MIT).
 * Prefer this when you just want to highlight today's workout muscles.
 */
export function BodyHighlighter({
  focus,
  muscles,
  highlights,
  view = 'front',
  highlightColor = 'var(--primary)',
  defaultFill = 'var(--muscle-default)',
  className,
  interactive = true,
  onMuscleClick,
}: BodyHighlighterProps) {
  const resolved =
    highlights ??
    highlightsFromMuscles(
      muscles ?? (focus ? WORKOUT_MUSCLES[focus] : []),
      highlightColor
    )

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <MuscleMap
        view={view}
        highlights={resolved}
        defaultFill={defaultFill}
        interactive={interactive}
        onMuscleClick={onMuscleClick}
      />
    </div>
  )
}

/** @deprecated Use WORKOUT_MUSCLES from @/components/muscle-map */
export const MUSCLE_GROUPS = WORKOUT_MUSCLES
