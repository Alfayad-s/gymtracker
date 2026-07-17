'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { Bot, Loader2, Sparkles, X } from 'lucide-react'
import type { CreateExerciseInput } from '@/data/exercises'
import { Button } from '@/components/ui/button'

type AiExerciseSuggestSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (suggestion: CreateExerciseInput) => void
}

export function AiExerciseSuggestSheet({
  open,
  onOpenChange,
  onApply,
}: AiExerciseSuggestSheetProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<CreateExerciseInput | null>(null)

  const reset = () => {
    setName('')
    setError(null)
    setSuggestion(null)
    setIsLoading(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleGenerate = async () => {
    const trimmed = name.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)
    setError(null)
    setSuggestion(null)

    try {
      const res = await fetch('/api/ai/suggest-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = (await res.json()) as {
        suggestion?: CreateExerciseInput
        error?: string
      }

      if (!res.ok || !data.suggestion) {
        throw new Error(data.error || 'Could not generate exercise details')
      }

      setSuggestion(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate exercise details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!suggestion) return
    onApply(suggestion)
    handleOpenChange(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[88dvh] w-full flex-col rounded-t-[28px] border border-border bg-background outline-none sm:max-w-[430px]">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />

          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/25">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <Drawer.Title className="text-base font-bold text-foreground tracking-tight">
                  AI exercise fill
                </Drawer.Title>
                <Drawer.Description className="text-[11px] text-muted-foreground">
                  Enter a name — AI drafts the rest for you to confirm.
                </Drawer.Description>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-xl border border-border bg-card p-2 text-muted-foreground cursor-pointer active:scale-95"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
            {!suggestion ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Exercise name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleGenerate()
                      }
                    }}
                    placeholder="e.g. Cable Fly, Bulgarian Split Squat"
                    disabled={isLoading}
                    autoFocus
                    className="w-full h-12 rounded-[16px] border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div className="rounded-[14px] border border-destructive/25 bg-destructive/10 px-3 py-2.5">
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={!name.trim() || isLoading}
                  onClick={() => void handleGenerate()}
                  className="w-full h-12 rounded-[16px] bg-primary text-primary-foreground font-bold border-0 gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Fill with AI
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-[20px] border border-primary/25 bg-primary/5 p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Suggested details
                  </p>
                  <div>
                    <p className="text-lg font-bold text-foreground tracking-tight">
                      {suggestion.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {suggestion.muscleGroup}
                      {suggestion.target ? ` · ${suggestion.target}` : ''}
                      {' · '}
                      {suggestion.equipment}
                      {' · '}
                      {suggestion.difficulty}
                    </p>
                  </div>

                  {suggestion.secondary && suggestion.secondary.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Secondary: {suggestion.secondary.join(', ')}
                    </p>
                  )}

                  <ol className="list-decimal pl-4 space-y-1.5">
                    {suggestion.instructions.map((step) => (
                      <li key={step} className="text-sm text-foreground/90 leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Confirm to fill the form. You can edit anything before creating.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setSuggestion(null)
                      setError(null)
                    }}
                    className="flex-1 h-12 rounded-[16px] bg-muted text-foreground border-0"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 h-12 rounded-[16px] bg-primary text-primary-foreground font-bold border-0"
                  >
                    Use these details
                  </Button>
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
