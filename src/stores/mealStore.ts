'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealEntry = {
  id: string
  date: string // yyyy-MM-dd
  type: MealType
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  notes?: string
  imageUrl?: string
  createdAt: string
}

type MealState = {
  meals: MealEntry[]
  dailyCalorieGoal: number
  dailyProteinGoal: number
  addMeal: (input: Omit<MealEntry, 'id' | 'createdAt'>) => string
  updateMeal: (id: string, patch: Partial<Omit<MealEntry, 'id' | 'createdAt'>>) => void
  deleteMeal: (id: string) => void
  setGoals: (goals: { dailyCalorieGoal?: number; dailyProteinGoal?: number }) => void
  getMealsForDate: (date: string) => MealEntry[]
}

function newId() {
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Pick meal type from local clock (breakfast → lunch → dinner → snack). */
export function mealTypeFromTime(date = new Date()): MealType {
  const hour = date.getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      meals: [],
      dailyCalorieGoal: 2500,
      dailyProteinGoal: 160,

      addMeal: (input) => {
        const id = newId()
        const entry: MealEntry = {
          ...input,
          id,
          name: input.name.trim(),
          calories: Math.max(0, Math.round(input.calories)),
          proteinG: Math.max(0, Math.round(input.proteinG)),
          carbsG: Math.max(0, Math.round(input.carbsG)),
          fatG: Math.max(0, Math.round(input.fatG)),
          notes: input.notes?.trim() || undefined,
          imageUrl: input.imageUrl?.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ meals: [entry, ...state.meals].slice(0, 500) }))
        return id
      },

      updateMeal: (id, patch) => {
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === id
              ? {
                  ...meal,
                  ...patch,
                  ...(patch.name != null ? { name: patch.name.trim() } : {}),
                  ...(patch.calories != null
                    ? { calories: Math.max(0, Math.round(patch.calories)) }
                    : {}),
                  ...(patch.proteinG != null
                    ? { proteinG: Math.max(0, Math.round(patch.proteinG)) }
                    : {}),
                  ...(patch.carbsG != null
                    ? { carbsG: Math.max(0, Math.round(patch.carbsG)) }
                    : {}),
                  ...(patch.fatG != null
                    ? { fatG: Math.max(0, Math.round(patch.fatG)) }
                    : {}),
                }
              : meal
          ),
        }))
      },

      deleteMeal: (id) => {
        set((state) => ({ meals: state.meals.filter((m) => m.id !== id) }))
      },

      setGoals: (goals) => {
        set((state) => ({
          dailyCalorieGoal: goals.dailyCalorieGoal ?? state.dailyCalorieGoal,
          dailyProteinGoal: goals.dailyProteinGoal ?? state.dailyProteinGoal,
        }))
      },

      getMealsForDate: (date) => get().meals.filter((m) => m.date === date),
    }),
    { name: 'gymtrack-meals' }
  )
)

export function summarizeMeals(meals: MealEntry[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      proteinG: acc.proteinG + meal.proteinG,
      carbsG: acc.carbsG + meal.carbsG,
      fatG: acc.fatG + meal.fatG,
      count: acc.count + 1,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 }
  )
}
