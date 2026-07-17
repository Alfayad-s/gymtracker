import {
  format,
  startOfWeek,
  subWeeks,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import type { CompletedWorkout } from '@/stores/historyStore'

export type HistorySet = {
  setNumber: number
  weight: number
  reps: number
}

export type PersonalRecord = {
  exerciseId: string
  exerciseName: string
  heaviestLift: {
    weight: number
    reps: number
    date: string
    workoutName: string
  }
  highestVolumeSet: {
    volumeKg: number
    weight: number
    reps: number
    date: string
    workoutName: string
  }
  estimated1RM: {
    value: number
    weight: number
    reps: number
    date: string
    workoutName: string
  }
}

export type VolumePoint = { label: string; date: string; volume: number }
export type WeightPoint = { label: string; date: string; maxWeight: number }
export type FrequencyPoint = { label: string; weekStart: string; count: number }
export type BodyWeightPoint = { label: string; date: string; weight: number }

/** Epley formula for estimated 1-rep max */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export function setVolume(weight: number, reps: number) {
  return weight * reps
}

function parseBestSet(bestSet?: string): { weight: number; reps: number } | null {
  if (!bestSet) return null
  const match = bestSet.match(/([\d.]+)\s*kg\s*[×x]\s*(\d+)/i)
  if (!match) return null
  return { weight: parseFloat(match[1]), reps: parseInt(match[2], 10) }
}

/** Iterate every logged set across all workouts */
function* allSets(workouts: CompletedWorkout[]) {
  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      if (ex.loggedSets?.length) {
        for (const s of ex.loggedSets) {
          yield {
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            weight: s.weight,
            reps: s.reps,
            volumeKg: setVolume(s.weight, s.reps),
            date: workout.completedAt,
            workoutName: workout.name,
          }
        }
      } else {
        const parsed = parseBestSet(ex.bestSet)
        if (parsed && ex.sets > 0) {
          yield {
            exerciseId: ex.exerciseId ?? ex.name,
            exerciseName: ex.name,
            weight: parsed.weight,
            reps: parsed.reps,
            volumeKg: ex.volumeKg,
            date: workout.completedAt,
            workoutName: workout.name,
          }
        }
      }
    }
  }
}

export function computePersonalRecords(workouts: CompletedWorkout[]): PersonalRecord[] {
  const byExercise = new Map<string, PersonalRecord>()

  for (const set of allSets(workouts)) {
    const key = set.exerciseId || set.exerciseName
    let pr = byExercise.get(key)
    if (!pr) {
      pr = {
        exerciseId: key,
        exerciseName: set.exerciseName,
        heaviestLift: {
          weight: set.weight,
          reps: set.reps,
          date: set.date,
          workoutName: set.workoutName,
        },
        highestVolumeSet: {
          volumeKg: set.volumeKg,
          weight: set.weight,
          reps: set.reps,
          date: set.date,
          workoutName: set.workoutName,
        },
        estimated1RM: {
          value: estimate1RM(set.weight, set.reps),
          weight: set.weight,
          reps: set.reps,
          date: set.date,
          workoutName: set.workoutName,
        },
      }
      byExercise.set(key, pr)
      continue
    }

    if (set.weight > pr.heaviestLift.weight) {
      pr.heaviestLift = {
        weight: set.weight,
        reps: set.reps,
        date: set.date,
        workoutName: set.workoutName,
      }
    }

    if (set.volumeKg > pr.highestVolumeSet.volumeKg) {
      pr.highestVolumeSet = {
        volumeKg: set.volumeKg,
        weight: set.weight,
        reps: set.reps,
        date: set.date,
        workoutName: set.workoutName,
      }
    }

    const e1rm = estimate1RM(set.weight, set.reps)
    if (e1rm > pr.estimated1RM.value) {
      pr.estimated1RM = {
        value: e1rm,
        weight: set.weight,
        reps: set.reps,
        date: set.date,
        workoutName: set.workoutName,
      }
    }
  }

  return [...byExercise.values()].sort(
    (a, b) => b.estimated1RM.value - a.estimated1RM.value
  )
}

export function getGlobalHighlights(workouts: CompletedWorkout[]) {
  const prs = computePersonalRecords(workouts)
  const top1RM = prs[0] ?? null
  const heaviest = [...prs].sort((a, b) => b.heaviestLift.weight - a.heaviestLift.weight)[0] ?? null

  const totalVolume = workouts.reduce((s, w) => s + w.volumeKg, 0)
  const totalSessions = workouts.length

  return { top1RM, heaviest, totalVolume, totalSessions, prCount: prs.length }
}

export function getVolumeOverTime(workouts: CompletedWorkout[], limit = 12): VolumePoint[] {
  const sorted = [...workouts]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .slice(-limit)

  return sorted.map((w) => ({
    label: format(parseISO(w.completedAt), 'MMM d'),
    date: w.completedAt,
    volume: w.volumeKg,
  }))
}

export function getMaxWeightOverTime(workouts: CompletedWorkout[], limit = 12): WeightPoint[] {
  const sorted = [...workouts]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .slice(-limit)

  return sorted.map((w) => {
    let maxWeight = 0
    for (const ex of w.exercises) {
      if (ex.loggedSets?.length) {
        for (const s of ex.loggedSets) {
          if (s.weight > maxWeight) maxWeight = s.weight
        }
      } else {
        const parsed = parseBestSet(ex.bestSet)
        if (parsed && parsed.weight > maxWeight) maxWeight = parsed.weight
      }
    }
    return {
      label: format(parseISO(w.completedAt), 'MMM d'),
      date: w.completedAt,
      maxWeight: Math.round(maxWeight),
    }
  })
}

export function getWorkoutFrequency(workouts: CompletedWorkout[], weeks = 8): FrequencyPoint[] {
  const now = new Date()
  const points: FrequencyPoint[] = []

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const count = workouts.filter((w) =>
      isWithinInterval(parseISO(w.completedAt), { start: weekStart, end: weekEnd })
    ).length

    points.push({
      label: format(weekStart, 'MMM d'),
      weekStart: weekStart.toISOString(),
      count,
    })
  }

  return points
}

export function getWeeklyVolume(workouts: CompletedWorkout[], weeks = 8): VolumePoint[] {
  const now = new Date()
  const points: VolumePoint[] = []

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const volume = workouts
      .filter((w) =>
        isWithinInterval(parseISO(w.completedAt), { start: weekStart, end: weekEnd })
      )
      .reduce((sum, w) => sum + w.volumeKg, 0)

    points.push({
      label: format(weekStart, 'MMM d'),
      date: weekStart.toISOString(),
      volume,
    })
  }

  return points
}

export function getActiveStreakWeeks(workouts: CompletedWorkout[]): number {
  if (workouts.length === 0) return 0
  const freq = getWorkoutFrequency(workouts, 52)
  let streak = 0
  for (let i = freq.length - 1; i >= 0; i--) {
    if (freq[i].count > 0) streak++
    else break
  }
  return streak
}

/** Consecutive calendar days with at least one completed workout (ending today or yesterday). */
export function getActiveStreakDays(workouts: CompletedWorkout[]): number {
  if (workouts.length === 0) return 0
  const days = new Set(
    workouts.map((w) => format(parseISO(w.completedAt), 'yyyy-MM-dd'))
  )
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)

  if (!days.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function formatVolumeKg(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M kg`
  if (volume >= 10_000) return `${(volume / 1000).toFixed(1)}k kg`
  if (volume >= 1000) return `${(volume / 1000).toFixed(2)}k kg`
  return `${Math.round(volume)} kg`
}
