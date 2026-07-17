'use client'

import { getAllExercises } from '@/data/exercises'
import {
  getGroupRecovery,
  RECOVERY_GROUPS,
  type RecoveryGroup,
} from '@/lib/muscle-recovery'
import type { AgentContext } from '@/lib/ai/agent-types'
import { leanContextForModel } from '@/lib/ai/lean-context'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useMuscleGroupStore } from '@/stores/muscleGroupStore'
import { usePlanStore } from '@/stores/planStore'
import { useProfileStore } from '@/stores/profileStore'
import { useProgressStore } from '@/stores/progressStore'
import { useRecoveryStore } from '@/stores/recoveryStore'
import { useThemeStore } from '@/stores/themeStore'
import { useTimerStore } from '@/stores/timerStore'
import { useWorkoutStore } from '@/stores/workoutStore'

const HISTORY_LIMIT = 5
const CATALOG_LIMIT = 60
const HISTORY_ID_LIMIT = 30

export function buildAgentContext(): AgentContext {
  const plans = usePlanStore.getState().plans
  const activeSession = useWorkoutStore.getState().activeSession
  const workouts = useHistoryStore.getState().workouts
  const progress = useProgressStore.getState()
  const recovery = useRecoveryStore.getState().lastTrained
  const customExercises = useExerciseStore.getState().exercises
  const muscleGroups = useMuscleGroupStore.getState().groups
  const profile = useProfileStore.getState()
  const theme = useThemeStore.getState().theme
  const timer = useTimerStore.getState()

  const catalog = getAllExercises(customExercises).slice(0, CATALOG_LIMIT)

  const recoveries = RECOVERY_GROUPS.map((group) => {
    const r = getGroupRecovery(group, recovery[group]?.date ?? null)
    return {
      group: r.group,
      status: r.status,
      progress: Math.round(r.recoveredPct * 100),
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive,
      dayCount: plan.days.length,
      days: plan.days.map((day) => ({
        id: day.id,
        name: day.name,
        muscleFocus: day.muscleFocus,
        dayOfWeek: day.dayOfWeek,
        exercises: day.exercises.map((ex) => ({
          rowId: ex.id,
          exerciseId: ex.exerciseId,
          name: ex.name,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
        })),
      })),
    })),
    activeWorkout: activeSession
      ? {
          id: activeSession.id,
          name: activeSession.name,
          exerciseCount: activeSession.exercises.length,
          exercises: activeSession.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.name,
            setCount: ex.sets.length,
            completedSets: ex.sets.filter((s) => s.isCompleted).length,
            sets: ex.sets.map((s, setIndex) => ({
              setIndex,
              weight: s.weight,
              reps: s.reps,
              isCompleted: s.isCompleted,
            })),
          })),
        }
      : null,
    recentHistory: workouts.slice(0, HISTORY_LIMIT).map((w) => ({
      id: w.id,
      name: w.name,
      completedAt: w.completedAt,
      totalSets: w.totalSets,
      volumeKg: w.volumeKg,
    })),
    historyIds: workouts.slice(0, HISTORY_ID_LIMIT).map((w) => w.id),
    progress: {
      goalWeight: progress.goalWeight,
      recentBodyWeight: progress.bodyWeightLog.slice(0, 5).map((e) => ({
        id: e.id,
        date: e.date,
        weight: e.weight,
      })),
    },
    recovery: recoveries,
    customExercises: customExercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      // Keep short — full steps only matter when updating that exercise
      instructions: ex.instructions.slice(0, 3),
    })),
    muscleGroups: muscleGroups.map((g) => ({
      id: g.id,
      name: g.name,
      anatomyBaseGroup: g.anatomyBaseGroup,
    })),
    profile: {
      fullName: profile.fullName,
      experienceLevel: profile.experienceLevel,
      heightCm: profile.heightCm,
      weightUnit: profile.weightUnit,
    },
    settings: { theme },
    restTimer: {
      isActive: timer.isActive,
      secondsRemaining: timer.secondsRemaining,
      duration: timer.duration,
    },
    // Names only for duplicate checks — instructions blow past Groq TPM limits
    exerciseCatalog: catalog.map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      isCustom: ex.isCustom,
    })),
  }
}

export { leanContextForModel } from '@/lib/ai/lean-context'

/** Compact JSON for API — strips nothing sensitive (no tokens/avatars). */
export function serializeAgentContext(context: AgentContext): string {
  return JSON.stringify(leanContextForModel(context))
}

export type AgentContextSnapshot = AgentContext & {
  recoveryGroups?: RecoveryGroup[]
}
