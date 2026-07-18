import { z } from 'zod'

export const CHALLENGE_CATEGORIES = [
  'Workout',
  'Cardio',
  'Nutrition',
  'Recovery',
  'Progress',
  'Habit',
  'Mindfulness',
  'Hydration',
  'Strength',
  'Mobility',
] as const

export const CHALLENGE_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Extreme'] as const

export const CHALLENGE_STATUSES = ['pending', 'completed', 'expired', 'skipped'] as const

export const CHALLENGE_PERIODS = ['daily', 'weekly', 'monthly'] as const

export type ChallengeCategory = (typeof CHALLENGE_CATEGORIES)[number]
export type ChallengeDifficulty = (typeof CHALLENGE_DIFFICULTIES)[number]
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number]
export type ChallengePeriod = (typeof CHALLENGE_PERIODS)[number]

export const GeneratedChallengeSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(2).max(240),
  category: z.enum(CHALLENGE_CATEGORIES),
  difficulty: z.enum(CHALLENGE_DIFFICULTIES),
  targetValue: z.number().positive(),
  unit: z.string().min(1).max(32),
  xpReward: z.number().int().positive().optional(),
  coinReward: z.number().int().positive().optional(),
  autoComplete: z.boolean().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  badgeReward: z.string().nullable().optional(),
})

export const GeneratedChallengesSchema = z.array(GeneratedChallengeSchema).min(1).max(8)

export type GeneratedChallenge = z.infer<typeof GeneratedChallengeSchema>

export type DailyChallenge = {
  id: string
  userId: string
  date: string
  period: ChallengePeriod
  title: string
  description: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  targetValue: number
  currentValue: number
  unit: string
  status: ChallengeStatus
  xpReward: number
  coinReward: number
  badgeReward: string | null
  icon: string | null
  color: string | null
  autoComplete: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type UserRewards = {
  id: string
  userId: string
  level: number
  xp: number
  coins: number
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | null
  badges: string[]
  updatedAt: string
}

export type ChallengeHistoryEntry = {
  id: string
  userId: string
  challengeId: string
  completedAt: string
  xpEarned: number
  coinsEarned: number
  challenge?: Pick<DailyChallenge, 'title' | 'category' | 'difficulty' | 'date' | 'period'>
}

export type ChallengeGeneratorInput = {
  goal: string
  todayWorkout: string | null
  workoutHistory: Array<{ name: string; date: string; exercises?: number }>
  latestBIA: {
    weight?: number | null
    bodyFatPercent?: number | null
    skeletalMuscleMass?: number | null
    bodyScore?: number | null
  } | null
  recovery: { score: number; note?: string }
  streak: number
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  proteinTarget: number
  waterTarget: number
  calorieTarget?: number
  todayDate: string
  yesterdayTitles: string[]
  skippedYesterday: boolean
  completedChallengeTitles?: string[]
}

export type ChallengeAnalytics = {
  completionRate: number
  bestCategory: string | null
  mostMissedCategory: string | null
  currentStreak: number
  longestStreak: number
  totalXp: number
  totalCoins: number
  weeklyCompletionRate: number
  monthlyCompletionRate: number
}
