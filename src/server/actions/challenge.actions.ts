'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { ensureProfile } from '@/lib/auth/ensure-profile'
import {
  generateDailyChallenges,
  generateMonthlyChallenges,
  generateWeeklyChallenges,
} from '@/lib/ai/challenge-generator'
import {
  autoCompleteMatching,
  completeChallenge,
  ensureUserRewards,
  expirePendingBefore,
  firstOfMonth,
  formatDateKey,
  getAnalytics,
  getChallengesForDate,
  getYesterdayTitles,
  insertGeneratedChallenges,
  listHistory,
  maybeResetStreak,
  mondayOf,
  skipChallenge,
  updateChallengeProgress,
  shiftDate,
  type CompleteResult,
} from '@/lib/challenges/db'
import type {
  ChallengeAnalytics,
  ChallengeGeneratorInput,
  ChallengeHistoryEntry,
  DailyChallenge,
  UserRewards,
} from '@/lib/challenges/types'

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await ensureProfile({
    id: user.id,
    fullName:
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ||
      (user.user_metadata?.picture as string | undefined) ||
      null,
  })
  return user.id
}

const GeneratorInputSchema = z.object({
  goal: z.string().default('general fitness'),
  todayWorkout: z.string().nullable().default(null),
  workoutHistory: z
    .array(
      z.object({
        name: z.string(),
        date: z.string(),
        exercises: z.number().optional(),
      })
    )
    .default([]),
  latestBIA: z
    .object({
      weight: z.number().nullable().optional(),
      bodyFatPercent: z.number().nullable().optional(),
      skeletalMuscleMass: z.number().nullable().optional(),
      bodyScore: z.number().nullable().optional(),
    })
    .nullable()
    .default(null),
  recovery: z.object({
    score: z.number().min(0).max(100),
    note: z.string().optional(),
  }),
  streak: z.number().int().min(0).default(0),
  weight: z.number().nullable().default(null),
  bodyFat: z.number().nullable().default(null),
  muscleMass: z.number().nullable().default(null),
  proteinTarget: z.number().positive().default(150),
  waterTarget: z.number().positive().default(3000),
  calorieTarget: z.number().positive().optional(),
  todayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  yesterdayTitles: z.array(z.string()).optional(),
  skippedYesterday: z.boolean().default(false),
  completedChallengeTitles: z.array(z.string()).optional(),
})

export type TodayChallengesPayload = {
  challenges: DailyChallenge[]
  weekly: DailyChallenge[]
  monthly: DailyChallenge[]
  rewards: UserRewards
  analytics: ChallengeAnalytics
}

export async function getTodayChallengesAction(
  input: z.input<typeof GeneratorInputSchema>
): Promise<TodayChallengesPayload> {
  const userId = await requireUserId()
  const parsed = GeneratorInputSchema.parse(input)
  const today = parsed.todayDate
  const yesterday = shiftDate(today, -1)

  await expirePendingBefore(userId, today)
  let rewards = await maybeResetStreak(userId, today)

  let challenges = await getChallengesForDate(userId, today, 'daily')
  if (challenges.length === 0) {
    const yesterdayTitles =
      parsed.yesterdayTitles ?? (await getYesterdayTitles(userId, yesterday))
    const yesterdayChallenges = await getChallengesForDate(userId, yesterday, 'daily')
    const skippedYesterday =
      parsed.skippedYesterday ||
      (yesterdayChallenges.length > 0 &&
        yesterdayChallenges.every((c) => c.status !== 'completed'))

    const genInput: ChallengeGeneratorInput = {
      ...parsed,
      yesterdayTitles,
      skippedYesterday,
    }
    const generated = await generateDailyChallenges(genInput)
    challenges = await insertGeneratedChallenges(userId, today, 'daily', generated)

    // Habit: open app — auto-complete check-in challenges
    await autoCompleteMatching(
      userId,
      today,
      (c) =>
        c.category === 'Habit' &&
        /open|check.?in|app/i.test(c.title + c.description)
    )
    challenges = await getChallengesForDate(userId, today, 'daily')
  }

  const weekKey = mondayOf(today)
  let weekly = await getChallengesForDate(userId, weekKey, 'weekly')
  if (weekly.length === 0 && new Date(today + 'T12:00:00').getDay() === 1) {
    const generated = await generateWeeklyChallenges({
      ...parsed,
      yesterdayTitles: [],
      skippedYesterday: false,
    })
    weekly = await insertGeneratedChallenges(userId, weekKey, 'weekly', generated)
  } else if (weekly.length === 0) {
    // Backfill weekly if missing mid-week
    const generated = await generateWeeklyChallenges({
      ...parsed,
      yesterdayTitles: [],
      skippedYesterday: false,
    })
    weekly = await insertGeneratedChallenges(userId, weekKey, 'weekly', generated)
  }

  const monthKey = firstOfMonth(today)
  let monthly = await getChallengesForDate(userId, monthKey, 'monthly')
  if (monthly.length === 0) {
    const generated = await generateMonthlyChallenges({
      ...parsed,
      yesterdayTitles: [],
      skippedYesterday: false,
    })
    monthly = await insertGeneratedChallenges(userId, monthKey, 'monthly', generated)
  }

  rewards = await ensureUserRewards(userId)
  const analytics = await getAnalytics(userId)

  return { challenges, weekly, monthly, rewards, analytics }
}

export async function completeChallengeAction(
  challengeId: string,
  currentValue?: number
): Promise<CompleteResult> {
  const userId = await requireUserId()
  const result = await completeChallenge(userId, challengeId, currentValue)
  if (!result) throw new Error('Challenge not found or already completed')
  revalidatePath('/challenges')
  revalidatePath('/dashboard')
  return result
}

export async function updateProgressAction(
  challengeId: string,
  currentValue: number
): Promise<DailyChallenge> {
  const userId = await requireUserId()
  const updated = await updateChallengeProgress(userId, challengeId, currentValue)
  if (!updated) throw new Error('Unable to update progress')
  revalidatePath('/challenges')
  return updated
}

export async function skipChallengeAction(challengeId: string): Promise<DailyChallenge> {
  const userId = await requireUserId()
  const updated = await skipChallenge(userId, challengeId)
  if (!updated) throw new Error('Unable to skip challenge')
  revalidatePath('/challenges')
  return updated
}

export async function getChallengeHistoryAction(
  limit = 30,
  offset = 0
): Promise<ChallengeHistoryEntry[]> {
  const userId = await requireUserId()
  return listHistory(userId, limit, offset)
}

export async function getRewardsAction(): Promise<UserRewards> {
  const userId = await requireUserId()
  return ensureUserRewards(userId)
}

export async function getAnalyticsAction(): Promise<ChallengeAnalytics> {
  const userId = await requireUserId()
  return getAnalytics(userId)
}

/** Called from workout finish / BIA upload / weight log to auto-complete matching challenges. */
export async function syncAutoCompletionsAction(payload: {
  todayDate: string
  event: 'workout' | 'weight' | 'bia' | 'photo' | 'steps'
  value?: number
}): Promise<CompleteResult[]> {
  const userId = await requireUserId()
  const { todayDate, event, value } = payload

  const results = await autoCompleteMatching(userId, todayDate, (c) => {
    const hay = `${c.title} ${c.description} ${c.category}`.toLowerCase()
    if (event === 'workout') {
      return (
        c.category === 'Workout' ||
        c.category === 'Strength' ||
        /workout|train|exercise|pr|volume/i.test(hay)
      )
    }
    if (event === 'weight') return /weight|measurement/i.test(hay)
    if (event === 'bia') return /bia|body composition|inbody/i.test(hay)
    if (event === 'photo') return /photo|progress pic/i.test(hay)
    if (event === 'steps') {
      if (value != null && c.unit === 'steps') {
        return value >= c.targetValue
      }
      return /steps|walk/i.test(hay)
    }
    return false
  })

  if (results.length) {
    revalidatePath('/challenges')
    revalidatePath('/dashboard')
  }
  return results
}

/** Sync water / protein totals into today's pending challenges (manual progress). */
export async function syncMetricProgressAction(payload: {
  todayDate: string
  metric: 'water' | 'protein'
  value: number
}): Promise<DailyChallenge[]> {
  const userId = await requireUserId()
  const { todayDate, metric, value } = payload
  const list = await getChallengesForDate(userId, todayDate, 'daily')
  const updated: DailyChallenge[] = []

  for (const c of list) {
    if (c.status !== 'pending') continue
    const hay = `${c.title} ${c.description} ${c.category} ${c.unit}`.toLowerCase()
    const isWater =
      metric === 'water' &&
      (c.category === 'Hydration' ||
        c.unit === 'ml' ||
        /water|hydrat|drink/i.test(hay))
    const isProtein =
      metric === 'protein' &&
      (c.unit === 'g' || /protein/i.test(hay)) &&
      (c.category === 'Nutrition' || /protein/i.test(hay))

    if (!isWater && !isProtein) continue

    const result = await updateChallengeProgress(userId, c.id, value)
    if (result) updated.push(result)
  }

  if (updated.length) {
    revalidatePath('/challenges')
    revalidatePath('/dashboard')
    revalidatePath('/meals')
  }
  return updated
}

export async function todayKeyAction(): Promise<string> {
  return formatDateKey(new Date())
}
