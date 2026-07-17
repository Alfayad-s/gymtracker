import type { AgentContext } from '@/lib/ai/agent-types'

/**
 * Ultra-compact snapshot for the LLM (validation still uses the full context).
 * Keeps tokens under Groq free-tier TPM (~6k).
 */
export function leanContextForModel(context: AgentContext) {
  return {
    generatedAt: context.generatedAt,
    profile: context.profile,
    settings: context.settings,
    restTimer: context.restTimer,
    recovery: context.recovery,
    progress: {
      goalWeight: context.progress.goalWeight,
      recentBodyWeight: context.progress.recentBodyWeight.slice(0, 3),
    },
    plans: context.plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive,
      days: plan.days.map((day) => ({
        id: day.id,
        name: day.name,
        muscleFocus: day.muscleFocus,
        dayOfWeek: day.dayOfWeek,
        exercises: day.exercises.map((ex) => ({
          rowId: ex.rowId,
          exerciseId: ex.exerciseId,
          name: ex.name,
          sets: ex.targetSets,
          reps: ex.targetReps,
        })),
      })),
    })),
    activeWorkout: context.activeWorkout
      ? {
          id: context.activeWorkout.id,
          name: context.activeWorkout.name,
          exercises: context.activeWorkout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.name,
            done: `${ex.completedSets}/${ex.setCount}`,
          })),
        }
      : null,
    recentHistory: context.recentHistory.slice(0, 3).map((w) => ({
      id: w.id,
      name: w.name,
      completedAt: w.completedAt,
    })),
    historyIds: context.historyIds.slice(0, 15),
    customExercises: context.customExercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
    })),
    muscleGroups: context.muscleGroups,
    exerciseCatalog: context.exerciseCatalog.map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
    })),
  }
}
