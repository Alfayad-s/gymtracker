'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/stores/workoutStore'
import { Search, Plus, ArrowLeft, Library } from 'lucide-react'
import Link from 'next/link'
import { toLegacyExercise } from '@/data/exercises'
import { MuscleFocusPreview } from '@/components/muscle-map'
import { useMergedExercises } from '@/hooks/useMergedExercises'
import { useMuscleGroups } from '@/hooks/useMuscleGroups'

export default function ExercisePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const allExercises = useMergedExercises()
  const muscleGroups = useMuscleGroups()
  const { addExercise, activeSession } = useWorkoutStore()

  const filteredExercises = useMemo(() => {
    const q = search.toLowerCase()
    return allExercises.filter((e) => {
      const matchesCategory = category === 'All' || e.muscleGroup === category
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [search, category, allExercises])

  const handleSelectExercise = (ex: (typeof allExercises)[0]) => {
    if (activeSession) {
      const legacy = toLegacyExercise(ex)
      addExercise(legacy.id, legacy.name, legacy.category, legacy.equipment, {
        targetSets: 3,
        targetReps: 10,
        restSeconds: 90,
      })
      router.push('/workout')
    } else {
      router.push(`/exercises/${ex.id}`)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Exercises</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/exercises/new"
            className="h-9 px-3 rounded-[12px] bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Link>
          <button
            type="button"
            onClick={() => router.push('/exercises')}
            className="h-9 px-3 rounded-[12px] bg-primary/15 border border-primary/25 text-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Library className="w-3.5 h-3.5" />
            Library
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercise or muscle..."
          className="w-full h-12 bg-card border border-border rounded-2xl pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {['All', ...muscleGroups.map((item) => item.name)].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-bold cursor-pointer ${
              category === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredExercises.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No exercises found.</p>
        ) : (
          filteredExercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleSelectExercise(ex)}
              className="w-full bg-card hover:bg-muted/80 border border-border rounded-2xl p-3 flex gap-3 items-center cursor-pointer transition-colors active:scale-[0.99] text-left"
            >
              <div className="w-16 h-16 rounded-2xl bg-background border border-border p-1.5 shrink-0">
                <MuscleFocusPreview
                  view={ex.anatomy.view}
                  primary={ex.anatomy.primary}
                  secondary={ex.anatomy.secondary}
                  className="w-full h-full"
                  size="list"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="text-sm font-bold text-foreground">{ex.name}</h4>
                <p className="text-[10px] text-muted-foreground">
                  Target · {ex.target}
                  {ex.secondary.length > 0 ? ` · ${ex.secondary.slice(0, 2).join(', ')}` : ''}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {ex.equipment} · {ex.difficulty}
                </p>
              </div>
              {activeSession && (
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
