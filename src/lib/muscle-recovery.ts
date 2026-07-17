import { WORKOUT_MUSCLES } from '@/components/muscle-map'
import { getExerciseById } from '@/data/exercises'
import { getCustomExercisesSnapshot } from '@/stores/exerciseStore'

export type RecoveryGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'

export const RECOVERY_GROUPS: RecoveryGroup[] = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
]

/** Approximate recovery window per muscle group, in hours. */
export const RECOVERY_HOURS: Record<RecoveryGroup, number> = {
  Chest: 48,
  Back: 48,
  Legs: 72,
  Shoulders: 48,
  Arms: 36,
  Core: 24,
}

/** Maps a recovery group to the anatomy slugs used by the MuscleMap. */
export const GROUP_TO_MAP: Record<RecoveryGroup, readonly string[]> = {
  Chest: WORKOUT_MUSCLES.chest,
  Back: WORKOUT_MUSCLES.back,
  Legs: WORKOUT_MUSCLES.legs,
  Shoulders: WORKOUT_MUSCLES.shoulders,
  Arms: WORKOUT_MUSCLES.arms,
  Core: WORKOUT_MUSCLES.abs,
}

export type RecoveryStatus = 'Fatigued' | 'Recovering' | 'Ready'

export const STATUS_COLOR: Record<RecoveryStatus, string> = {
  Fatigued: 'var(--destructive)',
  Recovering: 'var(--warning)',
  Ready: 'var(--primary)',
}

/** Maps a catalog muscle group to one or more recovery groups. */
export function catalogGroupToRecovery(group: string | undefined): RecoveryGroup[] {
  switch ((group ?? '').toLowerCase()) {
    case 'chest':
      return ['Chest']
    case 'back':
      return ['Back']
    case 'shoulders':
      return ['Shoulders']
    case 'arms':
      return ['Arms']
    case 'legs':
    case 'glutes':
      return ['Legs']
    case 'core':
      return ['Core']
    case 'full body':
      return ['Back', 'Legs', 'Core']
    default:
      return []
  }
}

/** Resolves recovery groups for a logged exercise via catalog or fallback category. */
export function recoveryGroupsForExercise(
  exerciseId: string,
  fallbackCategory?: string
): RecoveryGroup[] {
  const catalog = getExerciseById(exerciseId, getCustomExercisesSnapshot())
  const group = catalog?.muscleGroup ?? fallbackCategory
  return catalogGroupToRecovery(group)
}

export type GroupRecovery = {
  group: RecoveryGroup
  status: RecoveryStatus
  /** 0 (just trained) → 1 (fully recovered). */
  recoveredPct: number
  lastTrained: string | null
  readyAt: Date | null
  hoursRemaining: number
  label: string
}

function formatRemaining(hours: number): string {
  if (hours <= 0) return 'Ready now'
  const totalMinutes = Math.round(hours * 60)
  const days = Math.floor(totalMinutes / (60 * 24))
  const h = Math.floor((totalMinutes % (60 * 24)) / 60)
  if (days > 0) return `Ready in ${days}d ${h}h`
  if (h > 0) {
    const m = totalMinutes % 60
    return m > 0 && h < 3 ? `Ready in ${h}h ${m}m` : `Ready in ${h}h`
  }
  return `Ready in ${totalMinutes % 60}m`
}

export function getGroupRecovery(
  group: RecoveryGroup,
  lastTrained: string | null,
  now: number = Date.now()
): GroupRecovery {
  if (!lastTrained) {
    return {
      group,
      status: 'Ready',
      recoveredPct: 1,
      lastTrained: null,
      readyAt: null,
      hoursRemaining: 0,
      label: 'Rested',
    }
  }

  const recoveryHours = RECOVERY_HOURS[group]
  const elapsedHours = (now - new Date(lastTrained).getTime()) / (1000 * 60 * 60)
  const recoveredPct = Math.max(0, Math.min(1, elapsedHours / recoveryHours))
  const hoursRemaining = Math.max(0, recoveryHours - elapsedHours)
  const readyAt = new Date(new Date(lastTrained).getTime() + recoveryHours * 3600 * 1000)

  let status: RecoveryStatus
  if (recoveredPct >= 1) status = 'Ready'
  else if (recoveredPct < 0.34) status = 'Fatigued'
  else status = 'Recovering'

  return {
    group,
    status,
    recoveredPct,
    lastTrained,
    readyAt,
    hoursRemaining,
    label: status === 'Ready' ? 'Ready to train' : formatRemaining(hoursRemaining),
  }
}

export type MuscleTrainingSnapshot = {
  date: string
  volumeKg: number
}

/**
 * Rebuilds last-trained recovery state from workout history.
 * Used so deleting history clears / updates anatomy fatigue correctly.
 */
export function buildRecoveryFromWorkouts(
  workouts: {
    completedAt: string
    exercises: { exerciseId: string; name: string; volumeKg: number }[]
  }[]
): Partial<Record<RecoveryGroup, MuscleTrainingSnapshot>> {
  const result: Partial<Record<RecoveryGroup, MuscleTrainingSnapshot>> = {}
  if (workouts.length === 0) return result

  const sorted = [...workouts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )

  for (const workout of sorted) {
    const volumeByGroup = new Map<RecoveryGroup, number>()
    for (const ex of workout.exercises) {
      const groups = recoveryGroupsForExercise(ex.exerciseId, ex.name)
      for (const group of groups) {
        volumeByGroup.set(group, (volumeByGroup.get(group) ?? 0) + ex.volumeKg)
      }
    }
    for (const [group, volumeKg] of volumeByGroup) {
      if (!result[group]) {
        result[group] = { date: workout.completedAt, volumeKg }
      }
    }
  }

  return result
}
