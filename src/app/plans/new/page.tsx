'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { usePlanStore } from '@/stores/planStore'

export default function NewPlanPage() {
  const router = useRouter()
  const createPlan = usePlanStore((s) => s.createPlan)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [withWeekTemplate, setWithWeekTemplate] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleCreate = () => {
    if (!name.trim()) return
    setSaving(true)
    const id = createPlan({
      name: name.trim(),
      description: description.trim(),
      withWeekTemplate,
    })
    router.replace(`/plans/${id}`)
  }

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground tracking-tight">New Plan</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Plan name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push / Pull / Legs"
            className="mt-1.5 w-full h-[52px] bg-muted border border-border rounded-[20px] px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this split"
            rows={3}
            className="mt-1.5 w-full bg-muted border border-border rounded-[20px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm resize-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setWithWeekTemplate((v) => !v)}
          className={`w-full rounded-[20px] border p-4 text-left transition-colors cursor-pointer ${
            withWeekTemplate
              ? 'bg-primary/10 border-primary/30'
              : 'bg-card border-border'
          }`}
        >
          <p className="text-sm font-bold text-foreground">Start with Mon–Sun days</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pre-create seven weekday slots you can fill with exercises.
          </p>
        </button>
      </div>

      <button
        type="button"
        disabled={!name.trim() || saving}
        onClick={handleCreate}
        className="w-full h-[52px] bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold rounded-[20px] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Plan'}
      </button>
    </div>
  )
}
