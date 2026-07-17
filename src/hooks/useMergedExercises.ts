'use client'

import { useMemo } from 'react'
import { getAllExercises } from '@/data/exercises'
import { useExerciseStore } from '@/stores/exerciseStore'

export function useMergedExercises() {
  const customExercises = useExerciseStore((s) => s.exercises)
  return useMemo(() => getAllExercises(customExercises), [customExercises])
}
