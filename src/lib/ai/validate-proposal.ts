import {
  AGENT_ACTION_NAMES,
  exerciseNamesMatch,
  findExistingExerciseName,
  labelForAction,
  MAX_AGENT_ACTIONS,
  parseActionParams,
  riskForAction,
  type AgentAction,
  type AgentActionName,
  type AgentContext,
  type AgentProposal,
} from '@/lib/ai/agent-types'

type RawProposalAction = {
  action?: unknown
  params?: unknown
}

type RawProposal = {
  summary?: unknown
  actions?: unknown
}

function hasPlan(context: AgentContext, planId: string) {
  return context.plans.some((p) => p.id === planId)
}

function hasDay(context: AgentContext, planId: string, dayId: string) {
  const plan = context.plans.find((p) => p.id === planId)
  return plan?.days.some((d) => d.id === dayId) ?? false
}

function hasExerciseRow(
  context: AgentContext,
  planId: string,
  dayId: string,
  rowId: string
) {
  const plan = context.plans.find((p) => p.id === planId)
  const day = plan?.days.find((d) => d.id === dayId)
  return day?.exercises.some((e) => e.rowId === rowId) ?? false
}

function hasCatalogExercise(context: AgentContext, exerciseId: string) {
  return context.exerciseCatalog.some((e) => e.id === exerciseId)
}

function hasCustomExercise(context: AgentContext, exerciseId: string) {
  return context.customExercises.some((e) => e.id === exerciseId)
}

function hasActiveWorkoutExercise(context: AgentContext, exerciseId: string) {
  return context.activeWorkout?.exercises.some((e) => e.exerciseId === exerciseId) ?? false
}

function validatePreconditions(
  action: AgentActionName,
  params: Record<string, unknown>,
  context: AgentContext
): string | null {
  const planId = params.planId as string | undefined
  const dayId = params.dayId as string | undefined
  const rowId = params.exerciseRowId as string | undefined
  const exerciseId = params.exerciseId as string | undefined
  const workoutId = params.workoutId as string | undefined
  const entryId = params.entryId as string | undefined
  const groupId = params.groupId as string | undefined
  const setIndex = params.setIndex as number | undefined

  switch (action) {
    case 'create_plan':
    case 'add_body_weight':
    case 'set_goal_weight':
    case 'create_custom_exercise':
    case 'create_muscle_group':
    case 'set_profile':
    case 'set_height':
    case 'set_weight_unit':
    case 'set_theme':
    case 'start_rest_timer':
    case 'stop_rest_timer':
    case 'set_rest_duration':
      return null

    case 'update_plan':
    case 'delete_plan':
    case 'set_active_plan':
    case 'add_plan_day':
      if (!planId || !hasPlan(context, planId)) return `Plan not found: ${planId}`
      return null

    case 'update_plan_day':
    case 'delete_plan_day':
      if (!planId || !hasPlan(context, planId)) return `Plan not found: ${planId}`
      if (!dayId || !hasDay(context, planId, dayId)) return `Day not found: ${dayId}`
      return null

    case 'add_exercise_to_day':
      if (!planId || !hasPlan(context, planId)) return `Plan not found: ${planId}`
      if (!dayId || !hasDay(context, planId, dayId)) return `Day not found: ${dayId}`
      if (!exerciseId || !hasCatalogExercise(context, exerciseId))
        return `Exercise not in catalog: ${exerciseId}`
      return null

    case 'update_plan_exercise':
    case 'remove_plan_exercise':
      if (!planId || !hasPlan(context, planId)) return `Plan not found: ${planId}`
      if (!dayId || !hasDay(context, planId, dayId)) return `Day not found: ${dayId}`
      if (!rowId || !hasExerciseRow(context, planId, dayId, rowId))
        return `Exercise row not found: ${rowId}`
      return null

    case 'start_workout':
      if (context.activeWorkout) return 'A workout is already active'
      return null

    case 'cancel_workout':
    case 'finish_workout':
    case 'rename_workout':
    case 'set_workout_notes':
      if (!context.activeWorkout) return 'No active workout'
      return null

    case 'add_workout_exercise':
      if (!context.activeWorkout) return 'No active workout'
      if (!exerciseId || !hasCatalogExercise(context, exerciseId))
        return `Exercise not in catalog: ${exerciseId}`
      if (hasActiveWorkoutExercise(context, exerciseId))
        return `Exercise already in workout: ${exerciseId}`
      return null

    case 'remove_workout_exercise':
    case 'add_set':
    case 'update_set':
    case 'complete_set':
      if (!context.activeWorkout) return 'No active workout'
      if (!exerciseId || !hasActiveWorkoutExercise(context, exerciseId))
        return `Exercise not in active workout: ${exerciseId}`
      if (
        (action === 'update_set' || action === 'complete_set') &&
        setIndex != null
      ) {
        const ex = context.activeWorkout.exercises.find((e) => e.exerciseId === exerciseId)
        if (!ex || setIndex < 0 || setIndex >= ex.setCount)
          return `Invalid set index ${setIndex} for ${exerciseId}`
      }
      return null

    case 'remove_history_workout':
      if (!workoutId || !context.historyIds.includes(workoutId))
        return `Workout not found in history: ${workoutId}`
      return null

    case 'clear_history':
      return null

    case 'remove_body_weight':
      if (!entryId || !context.progress.recentBodyWeight.some((e) => e.id === entryId))
        return `Body weight entry not found: ${entryId}`
      return null

    case 'update_custom_exercise': {
      const resolvedId = typeof params.exerciseId === 'string' ? params.exerciseId : ''
      const resolvedName = typeof params.name === 'string' ? params.name : ''
      if (!resolvedId || !hasCustomExercise(context, resolvedId)) {
        return `Custom exercise not found: ${resolvedId || resolvedName || '(missing id)'}`
      }
      if (!resolvedName.trim()) return 'Exercise name is required after merge'
      return null
    }
    case 'delete_custom_exercise': {
      const resolvedId = typeof params.exerciseId === 'string' ? params.exerciseId : ''
      if (!resolvedId || !hasCustomExercise(context, resolvedId)) {
        return `Custom exercise not found for delete`
      }
      return null
    }

    case 'update_muscle_group':
    case 'delete_muscle_group':
      if (!groupId || !context.muscleGroups.some((g) => g.id === groupId))
        return `Muscle group not found: ${groupId}`
      return null

    default:
      return null
  }
}

function findCustomExercise(
  context: AgentContext,
  params: Record<string, unknown>
) {
  const exerciseId = typeof params.exerciseId === 'string' ? params.exerciseId.trim() : ''
  const nameRaw = typeof params.name === 'string' ? params.name.trim() : ''
  const name = nameRaw.toLowerCase()
  const isPronoun = !name || /^(that|this|it|the exercise|latest|last)$/i.test(nameRaw)

  if (exerciseId) {
    const byId = context.customExercises.find((e) => e.id === exerciseId)
    if (byId) return byId
  }

  if (name && !isPronoun) {
    const exact = context.customExercises.find((e) => e.name.toLowerCase() === name)
    if (exact) return exact
    const partial = context.customExercises.find(
      (e) => e.name.toLowerCase().includes(name) || name.includes(e.name.toLowerCase())
    )
    if (partial) return partial
  }

  // "Update that exercise" / empty params → newest custom exercise
  if (isPronoun && context.customExercises.length > 0) {
    return context.customExercises[0]
  }

  if (context.customExercises.length === 1) {
    return context.customExercises[0]
  }

  return null
}

function defaultWorkoutName(context: AgentContext): string {
  const active = context.plans.find((p) => p.isActive) ?? context.plans[0]
  if (!active) return 'Workout'

  const jsDay = new Date().getDay()
  const dayOfWeek = jsDay === 0 ? 7 : jsDay
  const today =
    active.days.find((d) => d.dayOfWeek === dayOfWeek) ??
    active.days.find((d) => d.name.toLowerCase() === ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayOfWeek - 1])

  if (today) {
    return today.muscleFocus
      ? `${today.name} — ${today.muscleFocus}`
      : today.name
  }

  return active.name || 'Workout'
}

function applyActionDefaults(
  action: AgentActionName,
  params: Record<string, unknown>,
  context: AgentContext
): Record<string, unknown> {
  if (action === 'start_workout') {
    const name = typeof params.name === 'string' ? params.name.trim() : ''
    if (!name) {
      return { ...params, name: defaultWorkoutName(context) }
    }
  }

  if (action === 'update_custom_exercise') {
    const existing = findCustomExercise(context, params)
    if (!existing) return params

    const nextInstructions = Array.isArray(params.instructions)
      ? (params.instructions as unknown[]).map((i) => String(i)).filter((i) => i.trim())
      : null

    // If updating with no instructions, prefer existing, else catalog match (e.g. Cable Fly)
    let instructions =
      nextInstructions && nextInstructions.length > 0
        ? nextInstructions
        : existing.instructions ?? []

    if (instructions.length === 0) {
      const catalogMatch = context.exerciseCatalog.find(
        (e) => e.name.toLowerCase() === existing.name.toLowerCase()
      ) as { instructions?: string[] } | undefined
      if (catalogMatch?.instructions?.length) {
        instructions = catalogMatch.instructions
      }
    }

    return {
      exerciseId: existing.id,
      name:
        typeof params.name === 'string' &&
        params.name.trim() &&
        !/^(that|this|it|the exercise|latest|last)$/i.test(params.name.trim())
          ? params.name.trim()
          : existing.name,
      muscleGroup:
        typeof params.muscleGroup === 'string' && params.muscleGroup.trim()
          ? params.muscleGroup.trim()
          : existing.muscleGroup,
      equipment:
        typeof params.equipment === 'string' && params.equipment.trim()
          ? params.equipment.trim()
          : existing.equipment || 'Other',
      difficulty:
        typeof params.difficulty === 'string' && params.difficulty
          ? params.difficulty
          : existing.difficulty || 'intermediate',
      instructions,
      ...(params.anatomyBaseGroup != null
        ? { anatomyBaseGroup: params.anatomyBaseGroup }
        : {}),
    }
  }

  if (action === 'delete_custom_exercise') {
    const existing = findCustomExercise(context, params)
    if (!existing) return params
    return { exerciseId: existing.id, name: existing.name }
  }

  return params
}

export function validateRawProposal(
  raw: RawProposal,
  context: AgentContext
): { ok: true; proposal: Omit<AgentProposal, 'status'> } | { ok: false; error: string } {
  if (!Array.isArray(raw.actions)) return { ok: false, error: 'Proposal actions must be an array' }
  if (raw.actions.length === 0) return { ok: false, error: 'Proposal must include at least one action' }
  if (raw.actions.length > MAX_AGENT_ACTIONS)
    return { ok: false, error: `Too many actions (max ${MAX_AGENT_ACTIONS})` }

  const actions: AgentAction[] = []
  const skippedExisting: string[] = []
  const seenCreateNames: string[] = []

  for (const item of raw.actions as RawProposalAction[]) {
    const actionName = item.action
    if (typeof actionName !== 'string' || !AGENT_ACTION_NAMES.includes(actionName as AgentActionName)) {
      return { ok: false, error: `Unknown or invalid action: ${String(actionName)}` }
    }

    const parsed = parseActionParams(actionName as AgentActionName, item.params ?? {})
    if (!parsed.ok) return { ok: false, error: `${actionName}: ${parsed.error}` }

    const params = applyActionDefaults(
      actionName as AgentActionName,
      parsed.params,
      context
    )

    // Skip creates that already exist in catalog/custom, or duplicates in this batch.
    if (actionName === 'create_custom_exercise') {
      const name = typeof params.name === 'string' ? params.name.trim() : ''
      if (!name) return { ok: false, error: 'create_custom_exercise: name is required' }

      const existingName = findExistingExerciseName(
        name,
        context.exerciseCatalog,
        context.customExercises
      )
      if (existingName) {
        skippedExisting.push(`${name} (have “${existingName}”)`)
        continue
      }

      const dupInBatch = seenCreateNames.some((seen) => exerciseNamesMatch(name, seen))
      if (dupInBatch) {
        skippedExisting.push(`${name} (duplicate in list)`)
        continue
      }

      seenCreateNames.push(name)
    }

    const precondition = validatePreconditions(
      actionName as AgentActionName,
      params,
      context
    )
    if (precondition) return { ok: false, error: `${actionName}: ${precondition}` }

    actions.push({
      action: actionName as AgentActionName,
      params,
      label: labelForAction(actionName as AgentActionName, params),
      risk: riskForAction(actionName as AgentActionName),
    })
  }

  if (actions.length === 0) {
    return {
      ok: false,
      error:
        skippedExisting.length > 0
          ? `Nothing new to create — already have: ${skippedExisting.join(', ')}`
          : 'Proposal must include at least one action',
    }
  }

  let summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''
  if (!summary) {
    summary = actions.map((a) => a.label).join('; ')
  }
  if (skippedExisting.length > 0) {
    summary = `${summary} · Skipped existing: ${skippedExisting.join(', ')}`
  }
  if (summary.length > 4000) return { ok: false, error: 'Proposal summary is too long' }

  return {
    ok: true,
    proposal: {
      id: `proposal-${Date.now().toString(36)}`,
      summary,
      actions,
    },
  }
}
