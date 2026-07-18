import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { challengeHistory, dailyChallenges, userRewards } from '@/db/schema'
import { levelFromXp } from '@/lib/challenges/rewards'
import type {
  ChallengeAnalytics,
  ChallengeHistoryEntry,
  ChallengePeriod,
  ChallengeStatus,
  DailyChallenge,
  GeneratedChallenge,
  UserRewards,
} from '@/lib/challenges/types'

function num(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function parseBadges(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function rowToChallenge(
  row: typeof dailyChallenges.$inferSelect
): DailyChallenge {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    period: (row.period as ChallengePeriod) || 'daily',
    title: row.title,
    description: row.description,
    category: row.category as DailyChallenge['category'],
    difficulty: row.difficulty as DailyChallenge['difficulty'],
    targetValue: num(row.targetValue),
    currentValue: num(row.currentValue),
    unit: row.unit,
    status: row.status as ChallengeStatus,
    xpReward: row.xpReward,
    coinReward: row.coinReward,
    badgeReward: row.badgeReward,
    icon: row.icon,
    color: row.color,
    autoComplete: row.autoComplete,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function rowToRewards(row: typeof userRewards.$inferSelect): UserRewards {
  return {
    id: row.id,
    userId: row.userId,
    level: row.level,
    xp: row.xp,
    coins: row.coins,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastCompletedDate: row.lastCompletedDate,
    badges: parseBadges(row.badges),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function ensureUserRewards(userId: string): Promise<UserRewards> {
  const existing = await db.query.userRewards.findFirst({
    where: eq(userRewards.userId, userId),
  })
  if (existing) return rowToRewards(existing)

  const [inserted] = await db
    .insert(userRewards)
    .values({ userId })
    .returning()
  return rowToRewards(inserted)
}

export async function getChallengesForDate(
  userId: string,
  date: string,
  period: ChallengePeriod = 'daily'
): Promise<DailyChallenge[]> {
  const rows = await db
    .select()
    .from(dailyChallenges)
    .where(
      and(
        eq(dailyChallenges.userId, userId),
        eq(dailyChallenges.date, date),
        eq(dailyChallenges.period, period)
      )
    )
    .orderBy(dailyChallenges.createdAt)
  return rows.map(rowToChallenge)
}

export async function getYesterdayTitles(
  userId: string,
  yesterday: string
): Promise<string[]> {
  const rows = await getChallengesForDate(userId, yesterday, 'daily')
  return rows.map((r) => r.title)
}

export async function insertGeneratedChallenges(
  userId: string,
  date: string,
  period: ChallengePeriod,
  generated: GeneratedChallenge[]
): Promise<DailyChallenge[]> {
  if (!generated.length) return []
  const rows = await db
    .insert(dailyChallenges)
    .values(
      generated.map((g) => ({
        userId,
        date,
        period,
        title: g.title,
        description: g.description,
        category: g.category,
        difficulty: g.difficulty,
        targetValue: String(g.targetValue),
        currentValue: '0',
        unit: g.unit,
        status: 'pending' as const,
        xpReward: g.xpReward ?? 20,
        coinReward: g.coinReward ?? 10,
        badgeReward: g.badgeReward ?? null,
        icon: g.icon ?? null,
        color: g.color ?? null,
        autoComplete: g.autoComplete ?? false,
      }))
    )
    .returning()
  return rows.map(rowToChallenge)
}

export async function expirePendingBefore(
  userId: string,
  beforeDate: string
): Promise<void> {
  await db
    .update(dailyChallenges)
    .set({ status: 'expired' })
    .where(
      and(
        eq(dailyChallenges.userId, userId),
        eq(dailyChallenges.status, 'pending'),
        eq(dailyChallenges.period, 'daily'),
        lt(dailyChallenges.date, beforeDate)
      )
    )
}

export type CompleteResult = {
  challenge: DailyChallenge
  rewards: UserRewards
  leveledUp: boolean
  allDailyComplete: boolean
  streakIncreased: boolean
  newBadges: string[]
}

export async function completeChallenge(
  userId: string,
  challengeId: string,
  currentValue?: number
): Promise<CompleteResult | null> {
  const row = await db.query.dailyChallenges.findFirst({
    where: and(eq(dailyChallenges.id, challengeId), eq(dailyChallenges.userId, userId)),
  })
  if (!row || row.status === 'completed') return null

  const target = num(row.targetValue)
  const value = currentValue != null ? currentValue : target

  const [updated] = await db
    .update(dailyChallenges)
    .set({
      status: 'completed',
      currentValue: String(Math.max(value, target)),
      completedAt: new Date(),
    })
    .where(eq(dailyChallenges.id, challengeId))
    .returning()

  await db.insert(challengeHistory).values({
    userId,
    challengeId,
    xpEarned: row.xpReward,
    coinsEarned: row.coinReward,
  })

  const rewards = await ensureUserRewards(userId)
  const prevLevel = rewards.level
  const nextXp = rewards.xp + row.xpReward
  const nextCoins = rewards.coins + row.coinReward
  const nextLevel = levelFromXp(nextXp)
  const badges = new Set(rewards.badges)
  const newBadges: string[] = []

  const unlock = (id: string) => {
    if (!badges.has(id)) {
      badges.add(id)
      newBadges.push(id)
    }
  }

  if (row.category === 'Workout') unlock('first_workout')
  if (nextLevel >= 20) unlock('legend')

  const dayChallenges = await getChallengesForDate(userId, row.date, 'daily')
  const allDailyComplete =
    row.period === 'daily' &&
    dayChallenges.every((c) => c.id === challengeId || c.status === 'completed')

  let currentStreak = rewards.currentStreak
  let longestStreak = rewards.longestStreak
  let lastCompletedDate = rewards.lastCompletedDate
  let streakIncreased = false

  if (allDailyComplete) {
    const yesterday = shiftDate(row.date, -1)
    if (rewards.lastCompletedDate === yesterday) {
      currentStreak = rewards.currentStreak + 1
    } else if (rewards.lastCompletedDate === row.date) {
      currentStreak = rewards.currentStreak
    } else {
      currentStreak = 1
    }
    longestStreak = Math.max(longestStreak, currentStreak)
    lastCompletedDate = row.date
    streakIncreased = currentStreak > rewards.currentStreak

    if (currentStreak >= 7) unlock('streak_7')
    if (currentStreak >= 30) unlock('streak_30')
  }

  // Category mastery badges (simple counts)
  const hist = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(challengeHistory)
    .innerJoin(dailyChallenges, eq(challengeHistory.challengeId, dailyChallenges.id))
    .where(
      and(
        eq(challengeHistory.userId, userId),
        eq(dailyChallenges.category, 'Hydration')
      )
    )
  if ((hist[0]?.count ?? 0) >= 30) unlock('hydration_master')

  const proteinHist = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(challengeHistory)
    .innerJoin(dailyChallenges, eq(challengeHistory.challengeId, dailyChallenges.id))
    .where(
      and(
        eq(challengeHistory.userId, userId),
        eq(dailyChallenges.category, 'Nutrition')
      )
    )
  if ((proteinHist[0]?.count ?? 0) >= 20) unlock('protein_hero')

  const workoutHist = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(challengeHistory)
    .innerJoin(dailyChallenges, eq(challengeHistory.challengeId, dailyChallenges.id))
    .where(
      and(
        eq(challengeHistory.userId, userId),
        eq(dailyChallenges.category, 'Workout')
      )
    )
  if ((workoutHist[0]?.count ?? 0) >= 100) unlock('workouts_100')

  const biaHist = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(challengeHistory)
    .innerJoin(dailyChallenges, eq(challengeHistory.challengeId, dailyChallenges.id))
    .where(
      and(
        eq(challengeHistory.userId, userId),
        sql`lower(${dailyChallenges.title}) like '%bia%'`
      )
    )
  if ((biaHist[0]?.count ?? 0) >= 3) unlock('body_transformation')

  const [rewardRow] = await db
    .update(userRewards)
    .set({
      xp: nextXp,
      coins: nextCoins,
      level: nextLevel,
      currentStreak,
      longestStreak,
      lastCompletedDate,
      badges: JSON.stringify([...badges]),
    })
    .where(eq(userRewards.userId, userId))
    .returning()

  return {
    challenge: rowToChallenge(updated),
    rewards: rowToRewards(rewardRow),
    leveledUp: nextLevel > prevLevel,
    allDailyComplete,
    streakIncreased,
    newBadges,
  }
}

export async function updateChallengeProgress(
  userId: string,
  challengeId: string,
  currentValue: number
): Promise<DailyChallenge | null> {
  const row = await db.query.dailyChallenges.findFirst({
    where: and(eq(dailyChallenges.id, challengeId), eq(dailyChallenges.userId, userId)),
  })
  if (!row || row.status !== 'pending') return null

  const target = num(row.targetValue)
  if (currentValue >= target) {
    const result = await completeChallenge(userId, challengeId, currentValue)
    return result?.challenge ?? null
  }

  const [updated] = await db
    .update(dailyChallenges)
    .set({ currentValue: String(currentValue) })
    .where(eq(dailyChallenges.id, challengeId))
    .returning()
  return rowToChallenge(updated)
}

export async function skipChallenge(
  userId: string,
  challengeId: string
): Promise<DailyChallenge | null> {
  const [updated] = await db
    .update(dailyChallenges)
    .set({ status: 'skipped' })
    .where(
      and(
        eq(dailyChallenges.id, challengeId),
        eq(dailyChallenges.userId, userId),
        eq(dailyChallenges.status, 'pending')
      )
    )
    .returning()
  return updated ? rowToChallenge(updated) : null
}

export async function listHistory(
  userId: string,
  limit = 30,
  offset = 0
): Promise<ChallengeHistoryEntry[]> {
  const rows = await db
    .select({
      id: challengeHistory.id,
      userId: challengeHistory.userId,
      challengeId: challengeHistory.challengeId,
      completedAt: challengeHistory.completedAt,
      xpEarned: challengeHistory.xpEarned,
      coinsEarned: challengeHistory.coinsEarned,
      title: dailyChallenges.title,
      category: dailyChallenges.category,
      difficulty: dailyChallenges.difficulty,
      date: dailyChallenges.date,
      period: dailyChallenges.period,
    })
    .from(challengeHistory)
    .innerJoin(dailyChallenges, eq(challengeHistory.challengeId, dailyChallenges.id))
    .where(eq(challengeHistory.userId, userId))
    .orderBy(desc(challengeHistory.completedAt))
    .limit(limit)
    .offset(offset)

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    challengeId: r.challengeId,
    completedAt: r.completedAt.toISOString(),
    xpEarned: r.xpEarned,
    coinsEarned: r.coinsEarned,
    challenge: {
      title: r.title,
      category: r.category as DailyChallenge['category'],
      difficulty: r.difficulty as DailyChallenge['difficulty'],
      date: r.date,
      period: (r.period as ChallengePeriod) || 'daily',
    },
  }))
}

export async function getAnalytics(userId: string): Promise<ChallengeAnalytics> {
  const rewards = await ensureUserRewards(userId)
  const all = await db
    .select()
    .from(dailyChallenges)
    .where(and(eq(dailyChallenges.userId, userId), eq(dailyChallenges.period, 'daily')))

  const total = all.length
  const completed = all.filter((c) => c.status === 'completed').length
  const completionRate = total ? Math.round((completed / total) * 100) : 0

  const byCatCompleted = new Map<string, number>()
  const byCatMissed = new Map<string, number>()
  for (const c of all) {
    if (c.status === 'completed') {
      byCatCompleted.set(c.category, (byCatCompleted.get(c.category) ?? 0) + 1)
    } else if (c.status === 'expired' || c.status === 'skipped') {
      byCatMissed.set(c.category, (byCatMissed.get(c.category) ?? 0) + 1)
    }
  }

  const bestCategory =
    [...byCatCompleted.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const mostMissedCategory =
    [...byCatMissed.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const today = new Date()
  const weekAgo = shiftDate(formatDateKey(today), -7)
  const monthAgo = shiftDate(formatDateKey(today), -30)
  const week = all.filter((c) => c.date >= weekAgo)
  const month = all.filter((c) => c.date >= monthAgo)

  const rate = (list: typeof all) => {
    if (!list.length) return 0
    return Math.round(
      (list.filter((c) => c.status === 'completed').length / list.length) * 100
    )
  }

  return {
    completionRate,
    bestCategory,
    mostMissedCategory,
    currentStreak: rewards.currentStreak,
    longestStreak: rewards.longestStreak,
    totalXp: rewards.xp,
    totalCoins: rewards.coins,
    weeklyCompletionRate: rate(week),
    monthlyCompletionRate: rate(month),
  }
}

export async function maybeResetStreak(userId: string, today: string): Promise<UserRewards> {
  const rewards = await ensureUserRewards(userId)
  if (!rewards.lastCompletedDate) return rewards

  const yesterday = shiftDate(today, -1)
  if (
    rewards.lastCompletedDate !== today &&
    rewards.lastCompletedDate !== yesterday &&
    rewards.currentStreak > 0
  ) {
    const [updated] = await db
      .update(userRewards)
      .set({ currentStreak: 0 })
      .where(eq(userRewards.userId, userId))
      .returning()
    return rowToRewards(updated)
  }
  return rewards
}

export async function autoCompleteMatching(
  userId: string,
  date: string,
  matcher: (c: DailyChallenge) => boolean
): Promise<CompleteResult[]> {
  const list = await getChallengesForDate(userId, date, 'daily')
  const results: CompleteResult[] = []
  for (const c of list) {
    if (c.status !== 'pending' || !c.autoComplete) continue
    if (!matcher(c)) continue
    const result = await completeChallenge(userId, c.id)
    if (result) results.push(result)
  }
  return results
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function shiftDate(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return formatDateKey(dt)
}

export function mondayOf(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  return formatDateKey(dt)
}

export function firstOfMonth(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`
}

export async function countPendingSince(userId: string, since: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dailyChallenges)
    .where(
      and(
        eq(dailyChallenges.userId, userId),
        eq(dailyChallenges.status, 'pending'),
        gte(dailyChallenges.date, since)
      )
    )
  return rows[0]?.count ?? 0
}
