'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ExerciseForm } from '@/components/exercises/ExerciseForm'
import { useExerciseStore } from '@/stores/exerciseStore'

export default function EditExercisePage() {
  const params = useParams<{ exerciseId: string }>()
  const exerciseId = decodeURIComponent(
    Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId || ''
  )
  const router = useRouter()
  const exercises = useExerciseStore((s) => s.exercises)
  const updateExercise = useExerciseStore((s) => s.updateExercise)
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === 'undefined') return false
    return useExerciseStore.persist?.hasHydrated?.() ?? false
  })

  useEffect(() => {
    if (useExerciseStore.persist?.hasHydrated?.()) {
      setHydrated(true)
      return
    }
    const unsub = useExerciseStore.persist?.onFinishHydration?.(() => setHydrated(true))
    const fallback = setTimeout(() => setHydrated(true), 800)
    return () => {
      unsub?.()
      clearTimeout(fallback)
    }
  }, [])

  const exercise = useMemo(
    () => exercises.find((ex) => ex.id === exerciseId),
    [exercises, exerciseId]
  )

  if (!hydrated) {
    return (
      <div className="p-6 space-y-4 animate-pulse" aria-busy="true">
        <div className="h-8 w-40 rounded-lg bg-muted/80" />
        <div className="h-12 w-full rounded-xl bg-muted/80" />
        <div className="h-12 w-full rounded-xl bg-muted/80" />
        <div className="h-24 w-full rounded-xl bg-muted/80" />
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Custom exercise not found.</p>
        <button
          type="button"
          onClick={() => router.push('/exercises')}
          className="text-sm font-bold text-primary cursor-pointer"
        >
          Back to library
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Edit Exercise</h1>
          <p className="text-xs text-muted-foreground">{exercise.name}</p>
        </div>
      </div>

      <ExerciseForm
        exerciseKey={exercise.id}
        initial={{
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          target: exercise.target,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions,
          secondary: exercise.secondary,
          imageUrl: exercise.imageUrl,
          videoUrl: exercise.videoUrl,
        }}
        submitLabel="Save Changes"
        onCancel={() => router.back()}
        onSubmit={(input) => {
          updateExercise(exercise.id, input)
          router.replace(`/exercises/${exercise.id}`)
        }}
      />
    </div>
  )
}
