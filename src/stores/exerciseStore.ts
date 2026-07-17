'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buildCustomExercise,
  getMuscleGroupDefaults,
  withNormalizedAnatomy,
  type BuiltInMuscleGroup,
  type CatalogExercise,
  type CreateExerciseInput,
} from '@/data/exercises'

const STORAGE_KEY = 'gymtrack-custom-exercises'

type ExerciseState = {
  exercises: CatalogExercise[]
  createExercise: (input: CreateExerciseInput) => string
  updateExercise: (id: string, input: CreateExerciseInput) => void
  deleteExercise: (id: string) => void
  reassignMuscleGroup: (
    fromGroup: string,
    toGroup: string,
    anatomyBaseGroup?: BuiltInMuscleGroup
  ) => void
  getById: (id: string) => CatalogExercise | undefined
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      exercises: [],

      createExercise: (input) => {
        const exercise = buildCustomExercise(input)
        set((state) => ({ exercises: [exercise, ...state.exercises] }))
        return exercise.id
      },

      updateExercise: (id, input) => {
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === id ? buildCustomExercise(input, id) : ex
          ),
        }))
      },

      deleteExercise: (id) => {
        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== id),
        }))
      },

      reassignMuscleGroup: (fromGroup, toGroup, anatomyBaseGroup) =>
        set((state) => ({
          exercises: state.exercises.map((exercise) => {
            if (exercise.muscleGroup !== fromGroup) return exercise
            const anatomy = anatomyBaseGroup
              ? getMuscleGroupDefaults(anatomyBaseGroup)
              : null
            return {
              ...exercise,
              muscleGroup: toGroup,
              ...(anatomy
                ? {
                    anatomy: {
                      view: anatomy.view,
                      primary: [...anatomy.primary],
                      secondary: [...anatomy.secondary],
                    },
                  }
                : {}),
            }
          }),
        })),

      getById: (id) => get().exercises.find((ex) => ex.id === id),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { exercises?: CatalogExercise[] }
        if (!state?.exercises) return persisted as { exercises: CatalogExercise[] }
        return {
          ...state,
          exercises: state.exercises.map(withNormalizedAnatomy),
        }
      },
    }
  )
)

/** Read custom exercises outside React (e.g. muscle recovery helpers). */
export function getCustomExercisesSnapshot(): CatalogExercise[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { exercises?: CatalogExercise[] } }
    return parsed.state?.exercises ?? []
  } catch {
    return []
  }
}
