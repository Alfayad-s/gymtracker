import type { RagChunkInput } from './types'

export function formatWorkoutChunk(input: {
  id: string
  name: string
  completedAt?: string | null
  startedAt?: string | null
  durationMinutes?: number | null
  volumeKg?: number | null
  totalSets?: number | null
  exercises?: Array<{
    name: string
    sets?: number
    bestSet?: string
    loggedSets?: Array<{ weight: number; reps: number; setNumber?: number }>
  }>
}): RagChunkInput {
  const date = (input.completedAt || input.startedAt || '').slice(0, 10) || 'unknown-date'
  const parts: string[] = [
    `Workout "${input.name}" on ${date}.`,
  ]
  if (input.durationMinutes != null) parts.push(`Duration ${input.durationMinutes} min.`)
  if (input.volumeKg != null) parts.push(`Volume ${Math.round(input.volumeKg)} kg.`)
  if (input.totalSets != null) parts.push(`${input.totalSets} sets.`)

  for (const ex of input.exercises ?? []) {
    const sets =
      ex.loggedSets
        ?.map((s) => `${s.weight}kg×${s.reps}`)
        .join(', ') ||
      (ex.bestSet ? `best ${ex.bestSet}` : ex.sets != null ? `${ex.sets} sets` : '')
    parts.push(`${ex.name}: ${sets || 'logged'}.`)
  }

  return {
    title: `${date} · ${input.name}`,
    content: parts.join(' '),
    metadata: { date, workoutId: input.id, kind: 'workout' },
  }
}

export function formatMealChunk(input: {
  id: string
  name?: string | null
  description?: string | null
  mealType?: string | null
  loggedAt?: string | null
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}): RagChunkInput {
  const date = (input.loggedAt || '').slice(0, 10) || 'unknown-date'
  const title = input.name || input.mealType || 'Meal'
  const macros = [
    input.calories != null ? `${Math.round(input.calories)} kcal` : null,
    input.protein != null ? `${Math.round(input.protein)}g protein` : null,
    input.carbs != null ? `${Math.round(input.carbs)}g carbs` : null,
    input.fat != null ? `${Math.round(input.fat)}g fat` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    title: `${date} · ${title}`,
    content: [
      `Meal on ${date}: ${title}.`,
      input.description ? `Description: ${input.description}.` : '',
      macros ? `Macros: ${macros}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
    metadata: { date, mealId: input.id, kind: 'meal' },
  }
}

export function formatBodyCompositionChunk(input: {
  id: string
  reportDate: string
  weight?: number | null
  bodyFatPercent?: number | null
  skeletalMuscleMass?: number | null
  bmi?: number | null
  bodyScore?: number | null
  visceralFat?: number | null
  bmr?: number | null
}): RagChunkInput {
  const date = input.reportDate.slice(0, 10)
  const parts = [
    `InBody / body composition report on ${date}.`,
    input.weight != null ? `Weight ${input.weight} kg.` : '',
    input.bodyFatPercent != null ? `Body fat ${input.bodyFatPercent}%.` : '',
    input.skeletalMuscleMass != null ? `Skeletal muscle ${input.skeletalMuscleMass} kg.` : '',
    input.bmi != null ? `BMI ${input.bmi}.` : '',
    input.bodyScore != null ? `InBody score ${input.bodyScore}.` : '',
    input.visceralFat != null ? `Visceral fat ${input.visceralFat}.` : '',
    input.bmr != null ? `BMR ${input.bmr} kcal.` : '',
  ].filter(Boolean)

  return {
    title: `${date} · Body composition`,
    content: parts.join(' '),
    metadata: { date, reportId: input.id, kind: 'body_composition' },
  }
}

export function formatExerciseChunk(input: {
  id: string
  name: string
  muscleGroup?: string | null
  equipment?: string | null
  difficulty?: string | null
  instructions?: string | string[] | null
  description?: string | null
}): RagChunkInput {
  const steps = Array.isArray(input.instructions)
    ? input.instructions.join(' ')
    : typeof input.instructions === 'string'
      ? input.instructions
      : ''

  return {
    title: input.name,
    content: [
      `Exercise: ${input.name}.`,
      input.muscleGroup ? `Muscle: ${input.muscleGroup}.` : '',
      input.equipment ? `Equipment: ${input.equipment}.` : '',
      input.difficulty ? `Difficulty: ${input.difficulty}.` : '',
      input.description || '',
      steps ? `Cues: ${steps}` : '',
    ]
      .filter(Boolean)
      .join(' '),
    metadata: { exerciseId: input.id, kind: 'exercise' },
  }
}

export function formatPrChunk(input: {
  id: string
  exerciseName: string
  weight?: number | null
  reps?: number | null
  achievedAt?: string | null
}): RagChunkInput {
  const date = (input.achievedAt || '').slice(0, 10) || 'unknown-date'
  return {
    title: `PR · ${input.exerciseName}`,
    content: `Personal record on ${date}: ${input.exerciseName} — ${input.weight ?? '?'} kg × ${input.reps ?? '?'} reps.`,
    metadata: { date, prId: input.id, kind: 'pr' },
  }
}
