'use client'

import { useMemo } from 'react'
import {
  EXERCISE_CATEGORIES,
  type BuiltInMuscleGroup,
} from '@/data/exercises'
import { useMuscleGroupStore } from '@/stores/muscleGroupStore'

export type MuscleGroupOption = {
  name: string
  anatomyBaseGroup: BuiltInMuscleGroup
  isCustom: boolean
  id?: string
}

export function useMuscleGroups(): MuscleGroupOption[] {
  const customGroups = useMuscleGroupStore((state) => state.groups)

  return useMemo(
    () => [
      ...EXERCISE_CATEGORIES.map((name) => ({
        name,
        anatomyBaseGroup: name,
        isCustom: false,
      })),
      ...customGroups.map((group) => ({
        name: group.name,
        anatomyBaseGroup: group.anatomyBaseGroup,
        isCustom: true,
        id: group.id,
      })),
    ],
    [customGroups]
  )
}
