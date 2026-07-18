import type { ChallengeCategory, ChallengeDifficulty } from './types'

export const DIFFICULTY_REWARDS: Record<
  ChallengeDifficulty,
  { xp: number; coins: number }
> = {
  Easy: { xp: 20, coins: 10 },
  Medium: { xp: 50, coins: 25 },
  Hard: { xp: 100, coins: 50 },
  Extreme: { xp: 200, coins: 100 },
}

export const CATEGORY_META: Record<
  ChallengeCategory,
  { icon: string; color: string }
> = {
  Workout: { icon: 'dumbbell', color: '#8BB820' },
  Cardio: { icon: 'heart-pulse', color: '#ef4444' },
  Nutrition: { icon: 'apple', color: '#eab308' },
  Recovery: { icon: 'moon', color: '#38bdf8' },
  Progress: { icon: 'trending-up', color: '#a78bfa' },
  Habit: { icon: 'sparkles', color: '#8BB820' },
  Mindfulness: { icon: 'brain', color: '#c084fc' },
  Hydration: { icon: 'droplets', color: '#22d3ee' },
  Strength: { icon: 'zap', color: '#f97316' },
  Mobility: { icon: 'stretch', color: '#34d399' },
}

/** XP thresholds: level N requires xpForLevel(N) total XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  // Level 2=100, 3=250, 4=500, then +250 per level after
  if (level === 2) return 100
  if (level === 3) return 250
  if (level === 4) return 500
  return 500 + (level - 4) * 250
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) {
    level += 1
    if (level > 500) break
  }
  return level
}

export function levelProgress(xp: number): {
  level: number
  current: number
  next: number
  pct: number
} {
  const level = levelFromXp(xp)
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const span = Math.max(1, next - current)
  const pct = Math.min(100, Math.max(0, ((xp - current) / span) * 100))
  return { level, current, next, pct }
}

export const BADGE_DEFS = [
  { id: 'first_workout', label: 'First Workout', description: 'Complete your first workout challenge' },
  { id: 'streak_7', label: '7 Day Streak', description: 'Complete all challenges 7 days in a row' },
  { id: 'streak_30', label: '30 Day Streak', description: 'Complete all challenges 30 days in a row' },
  { id: 'workouts_100', label: '100 Workouts', description: 'Complete 100 workout challenges' },
  { id: 'hydration_master', label: 'Hydration Master', description: 'Complete 30 hydration challenges' },
  { id: 'protein_hero', label: 'Protein Hero', description: 'Hit protein goals 20 times' },
  { id: 'body_transformation', label: 'Body Transformation', description: 'Upload 3 BIA reports via challenges' },
  { id: 'legend', label: 'Legend', description: 'Reach level 20' },
] as const

export type BadgeId = (typeof BADGE_DEFS)[number]['id']
