'use client'

import { getAllExercises, getExerciseById } from '@/data/exercises'
import { findExistingExerciseName, type AgentAction, type AgentActionName } from '@/lib/ai/agent-types'
import { recoveryGroupsForExercise } from '@/lib/muscle-recovery'
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

export type ExecuteResult = {
  ok: boolean
  results: Array<{ action: AgentActionName; ok: boolean; message: string }>
  error?: string
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

function executeOne(action: AgentAction): { ok: boolean; message: string } {
  const { action: name, params } = action

  try {
    switch (name) {
      case 'create_plan': {
        const id = usePlanStore.getState().createPlan({
          name: str(params.name),
          description: str(params.description),
          withWeekTemplate: Boolean(params.withWeekTemplate),
        })
        return { ok: true, message: `Created plan (${id})` }
      }
      case 'update_plan': {
        usePlanStore.getState().updatePlan(str(params.planId), {
          ...(params.name != null ? { name: str(params.name) } : {}),
          ...(params.description != null ? { description: str(params.description) } : {}),
        })
        return { ok: true, message: 'Plan updated' }
      }
      case 'delete_plan': {
        usePlanStore.getState().deletePlan(str(params.planId))
        return { ok: true, message: 'Plan deleted' }
      }
      case 'set_active_plan': {
        usePlanStore.getState().setActivePlan(str(params.planId))
        return { ok: true, message: 'Active plan updated' }
      }
      case 'add_plan_day': {
        const dayId = usePlanStore.getState().addDay({
          planId: str(params.planId),
          name: str(params.name),
          muscleFocus: str(params.muscleFocus),
          dayOfWeek:
            params.dayOfWeek === null || params.dayOfWeek === undefined
              ? null
              : num(params.dayOfWeek) ?? null,
        })
        return { ok: true, message: `Day added (${dayId})` }
      }
      case 'update_plan_day': {
        usePlanStore.getState().updateDay(str(params.planId), str(params.dayId), {
          ...(params.name != null ? { name: str(params.name) } : {}),
          ...(params.muscleFocus != null ? { muscleFocus: str(params.muscleFocus) } : {}),
          ...(params.dayOfWeek !== undefined ? { dayOfWeek: params.dayOfWeek as number | null } : {}),
        })
        return { ok: true, message: 'Day updated' }
      }
      case 'delete_plan_day': {
        usePlanStore.getState().deleteDay(str(params.planId), str(params.dayId))
        return { ok: true, message: 'Day deleted' }
      }
      case 'add_exercise_to_day': {
        const exercise = getExerciseById(
          str(params.exerciseId),
          useExerciseStore.getState().exercises
        )
        if (!exercise) return { ok: false, message: 'Exercise not found in catalog' }
        const rowId = usePlanStore.getState().addExerciseToDay({
          planId: str(params.planId),
          dayId: str(params.dayId),
          exerciseId: exercise.id,
          name: exercise.name,
          category: exercise.muscleGroup,
          equipment: exercise.equipment,
          primaryMuscle: exercise.muscleGroup.toLowerCase(),
          secondaryMuscles: exercise.secondary,
          targetSets: num(params.targetSets),
          targetReps: num(params.targetReps),
        })
        return { ok: true, message: `Exercise added (${rowId})` }
      }
      case 'update_plan_exercise': {
        usePlanStore
          .getState()
          .updateDayExercise(
            str(params.planId),
            str(params.dayId),
            str(params.exerciseRowId),
            {
              ...(num(params.targetSets) != null ? { targetSets: num(params.targetSets) } : {}),
              ...(num(params.targetReps) != null ? { targetReps: num(params.targetReps) } : {}),
              ...(num(params.restSeconds) != null ? { restSeconds: num(params.restSeconds) } : {}),
              ...(params.notes != null ? { notes: str(params.notes) } : {}),
            }
          )
        return { ok: true, message: 'Plan exercise updated' }
      }
      case 'remove_plan_exercise': {
        usePlanStore
          .getState()
          .removeDayExercise(str(params.planId), str(params.dayId), str(params.exerciseRowId))
        return { ok: true, message: 'Plan exercise removed' }
      }
      case 'start_workout': {
        if (useWorkoutStore.getState().activeSession) {
          return { ok: false, message: 'Workout already active' }
        }
        const name = str(params.name).trim() || 'Workout'
        useWorkoutStore.getState().startWorkout(name)
        return { ok: true, message: `Workout started (${name})` }
      }
      case 'cancel_workout': {
        useWorkoutStore.getState().cancelWorkout()
        return { ok: true, message: 'Workout cancelled' }
      }
      case 'finish_workout': {
        const result = useWorkoutStore.getState().finishWorkout()
        if (!result) return { ok: false, message: 'No active workout to finish' }
        if (result.totalSets > 0) {
          useHistoryStore.getState().addWorkout(result)
          const volumeByGroup = new Map<string, number>()
          for (const ex of result.exercises) {
            const groups = recoveryGroupsForExercise(ex.exerciseId, ex.name)
            for (const group of groups) {
              volumeByGroup.set(group, (volumeByGroup.get(group) ?? 0) + ex.volumeKg)
            }
          }
          if (volumeByGroup.size > 0) {
            useRecoveryStore.getState().recordSession(
              [...volumeByGroup.entries()].map(([group, volumeKg]) => ({
                group: group as 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core',
                volumeKg,
              })),
              result.completedAt
            )
          }
        }
        return { ok: true, message: `Workout finished (${result.totalSets} sets)` }
      }
      case 'add_workout_exercise': {
        const exercise = getExerciseById(
          str(params.exerciseId),
          useExerciseStore.getState().exercises
        )
        if (!exercise) return { ok: false, message: 'Exercise not found' }
        useWorkoutStore.getState().addExercise(
          exercise.id,
          exercise.name,
          exercise.muscleGroup,
          exercise.equipment,
          {
            targetSets: num(params.targetSets),
            targetReps: num(params.targetReps),
            restSeconds: num(params.restSeconds),
          }
        )
        return { ok: true, message: `Added ${exercise.name}` }
      }
      case 'remove_workout_exercise': {
        useWorkoutStore.getState().removeExercise(str(params.exerciseId))
        return { ok: true, message: 'Exercise removed from workout' }
      }
      case 'add_set': {
        useWorkoutStore.getState().addSet(str(params.exerciseId))
        return { ok: true, message: 'Set added' }
      }
      case 'update_set': {
        const fields: Record<string, unknown> = {}
        if (params.weight != null) fields.weight = str(params.weight)
        if (num(params.reps) != null) fields.reps = num(params.reps)
        if (params.type != null) fields.type = params.type
        useWorkoutStore
          .getState()
          .updateSet(str(params.exerciseId), num(params.setIndex) ?? 0, fields)
        return { ok: true, message: 'Set updated' }
      }
      case 'complete_set': {
        useWorkoutStore
          .getState()
          .completeSet(str(params.exerciseId), num(params.setIndex) ?? 0)
        return { ok: true, message: 'Set completed' }
      }
      case 'rename_workout': {
        useWorkoutStore.getState().renameSession(str(params.name))
        return { ok: true, message: 'Workout renamed' }
      }
      case 'set_workout_notes': {
        useWorkoutStore.getState().setNotes(str(params.notes))
        return { ok: true, message: 'Workout notes updated' }
      }
      case 'remove_history_workout': {
        const workoutId = str(params.workoutId)
        if (!useHistoryStore.getState().getWorkout(workoutId)) {
          return { ok: false, message: 'Workout not found in history' }
        }
        useHistoryStore.getState().removeWorkout(workoutId)
        return { ok: true, message: 'History entry removed' }
      }
      case 'clear_history': {
        useHistoryStore.getState().clearHistory()
        return { ok: true, message: 'History cleared' }
      }
      case 'add_body_weight': {
        useProgressStore.getState().addBodyWeight(num(params.weight) ?? 0, str(params.date) || undefined)
        return { ok: true, message: 'Body weight logged' }
      }
      case 'remove_body_weight': {
        useProgressStore.getState().removeBodyWeight(str(params.entryId))
        return { ok: true, message: 'Body weight entry removed' }
      }
      case 'set_goal_weight': {
        useProgressStore.getState().setGoalWeight(
          params.weight === null ? null : (num(params.weight) ?? null)
        )
        return { ok: true, message: 'Goal weight updated' }
      }
      case 'create_custom_exercise': {
        const name = str(params.name)
        const custom = useExerciseStore.getState().exercises
        const existing = findExistingExerciseName(name, getAllExercises(), custom)
        if (existing) {
          return { ok: true, message: `Skipped “${name}” — already have “${existing}”` }
        }
        const id = useExerciseStore.getState().createExercise({
          name,
          muscleGroup: str(params.muscleGroup),
          equipment: str(params.equipment),
          difficulty: params.difficulty as 'beginner' | 'intermediate' | 'advanced',
          instructions: Array.isArray(params.instructions)
            ? params.instructions.map((i) => String(i))
            : [],
          anatomyBaseGroup: params.anatomyBaseGroup as
            | 'Chest'
            | 'Back'
            | 'Shoulders'
            | 'Arms'
            | 'Legs'
            | 'Core'
            | 'Glutes'
            | 'Full Body'
            | undefined,
        })
        return { ok: true, message: `Created ${name}` }
      }
      case 'update_custom_exercise': {
        const existing = useExerciseStore.getState().getById(str(params.exerciseId))
        if (!existing || !existing.isCustom) {
          return { ok: false, message: 'Custom exercise not found' }
        }
        useExerciseStore.getState().updateExercise(existing.id, {
          name: str(params.name) || existing.name,
          muscleGroup: str(params.muscleGroup) || existing.muscleGroup,
          equipment: str(params.equipment) || existing.equipment,
          difficulty:
            (params.difficulty as 'beginner' | 'intermediate' | 'advanced' | undefined) ??
            existing.difficulty,
          instructions: Array.isArray(params.instructions)
            ? params.instructions.map((i) => String(i))
            : existing.instructions,
          anatomyBaseGroup: params.anatomyBaseGroup as
            | 'Chest'
            | 'Back'
            | 'Shoulders'
            | 'Arms'
            | 'Legs'
            | 'Core'
            | 'Glutes'
            | 'Full Body'
            | undefined,
        })
        return { ok: true, message: `Updated ${existing.name}` }
      }
      case 'delete_custom_exercise': {
        const id = str(params.exerciseId)
        const existing =
          useExerciseStore.getState().getById(id) ||
          useExerciseStore
            .getState()
            .exercises.find(
              (e) =>
                e.isCustom &&
                e.name.toLowerCase() === str(params.name).toLowerCase()
            )
        if (!existing || !existing.isCustom) {
          return { ok: false, message: 'Custom exercise not found' }
        }
        useExerciseStore.getState().deleteExercise(existing.id)
        return { ok: true, message: `Deleted ${existing.name}` }
      }
      case 'create_muscle_group': {
        const id = useMuscleGroupStore.getState().createGroup(
          str(params.name),
          params.anatomyBaseGroup as
            | 'Chest'
            | 'Back'
            | 'Shoulders'
            | 'Arms'
            | 'Legs'
            | 'Core'
            | 'Glutes'
            | 'Full Body'
        )
        return { ok: true, message: `Muscle group created (${id})` }
      }
      case 'update_muscle_group': {
        const existing = useMuscleGroupStore
          .getState()
          .groups.find((g) => g.id === str(params.groupId))
        if (!existing) return { ok: false, message: 'Muscle group not found' }
        useMuscleGroupStore.getState().updateGroup(str(params.groupId), {
          name: params.name != null ? str(params.name) : existing.name,
          anatomyBaseGroup:
            (params.anatomyBaseGroup as typeof existing.anatomyBaseGroup | undefined) ??
            existing.anatomyBaseGroup,
        })
        return { ok: true, message: 'Muscle group updated' }
      }
      case 'delete_muscle_group': {
        const group = useMuscleGroupStore
          .getState()
          .groups.find((g) => g.id === str(params.groupId))
        if (!group) return { ok: false, message: 'Muscle group not found' }
        useExerciseStore
          .getState()
          .reassignMuscleGroup(group.name, str(params.reassignToGroup), group.anatomyBaseGroup)
        useMuscleGroupStore.getState().deleteGroup(group.id)
        return { ok: true, message: 'Muscle group deleted' }
      }
      case 'set_profile': {
        useProfileStore.getState().setProfile({
          ...(params.fullName !== undefined ? { fullName: params.fullName as string | null } : {}),
          ...(params.experienceLevel !== undefined
            ? { experienceLevel: params.experienceLevel as string | null }
            : {}),
        })
        return { ok: true, message: 'Profile updated' }
      }
      case 'set_height': {
        useProfileStore
          .getState()
          .setHeightCm(params.heightCm === null ? null : (num(params.heightCm) ?? null))
        return { ok: true, message: 'Height updated' }
      }
      case 'set_weight_unit': {
        useProfileStore.getState().setWeightUnit(params.unit as 'kg' | 'lbs')
        return { ok: true, message: 'Weight unit updated' }
      }
      case 'set_theme': {
        useThemeStore.getState().setTheme(params.theme as 'light' | 'dark')
        return { ok: true, message: 'Theme updated' }
      }
      case 'start_rest_timer': {
        useTimerStore.getState().startTimer(num(params.durationSeconds))
        return { ok: true, message: 'Rest timer started' }
      }
      case 'stop_rest_timer': {
        useTimerStore.getState().stopTimer()
        return { ok: true, message: 'Rest timer stopped' }
      }
      case 'set_rest_duration': {
        useTimerStore.getState().setDuration(num(params.durationSeconds) ?? 90)
        return { ok: true, message: 'Default rest duration updated' }
      }
      default:
        return { ok: false, message: `Unsupported action: ${name}` }
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Action failed',
    }
  }
}

export function executeAgentActions(actions: AgentAction[]): ExecuteResult {
  const results: ExecuteResult['results'] = []

  for (const action of actions) {
    const result = executeOne(action)
    results.push({ action: action.action, ...result })
    if (!result.ok) {
      return {
        ok: false,
        results,
        error: result.message,
      }
    }
  }

  return { ok: true, results }
}
