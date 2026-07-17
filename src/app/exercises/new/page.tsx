'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { AiExerciseSuggestSheet } from '@/components/exercises/AiExerciseSuggestSheet'
import { ExerciseForm } from '@/components/exercises/ExerciseForm'
import type { CreateExerciseInput } from '@/data/exercises'
import { useExerciseStore } from '@/stores/exerciseStore'

export default function NewExercisePage() {
  const router = useRouter()
  const createExercise = useExerciseStore((s) => s.createExercise)
  const [aiOpen, setAiOpen] = useState(false)
  const [draft, setDraft] = useState<Partial<CreateExerciseInput> | undefined>()
  const [formKey, setFormKey] = useState(0)
  const [aiFilled, setAiFilled] = useState(false)

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground tracking-tight">New Exercise</h1>
            <p className="text-xs text-muted-foreground">Add to your library</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="h-10 px-3 rounded-[14px] bg-primary/15 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI
        </button>
      </div>

      {aiFilled && (
        <div className="rounded-[16px] border border-primary/25 bg-primary/10 px-3.5 py-2.5">
          <p className="text-xs text-primary font-medium">
            AI filled the form — review the fields, then tap Create Exercise.
          </p>
        </div>
      )}

      <ExerciseForm
        key={formKey}
        initial={draft}
        submitLabel="Create Exercise"
        onCancel={() => router.back()}
        onSubmit={(input) => {
          const id = createExercise(input)
          router.replace(`/exercises/${id}`)
        }}
      />

      <AiExerciseSuggestSheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        onApply={(suggestion) => {
          setDraft(suggestion)
          setFormKey((k) => k + 1)
          setAiFilled(true)
        }}
      />
    </div>
  )
}
