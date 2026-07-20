'use client'

import { useRef, type FormEvent, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import {
  Camera,
  Coffee,
  Cookie,
  Loader2,
  Moon,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { MEAL_TYPE_LABELS, type MealType } from '@/stores/mealStore'
import { Button } from '@/components/ui/button'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const TYPE_ICON: Record<MealType, typeof Coffee> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  dinner: Moon,
  snack: Cookie,
}

type MealLogSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: MealType
  onTypeChange: (type: MealType) => void
  name: string
  onNameChange: (name: string) => void
  calories: string
  onCaloriesChange: (value: string) => void
  protein: string
  onProteinChange: (value: string) => void
  carbs: string
  onCarbsChange: (value: string) => void
  fat: string
  onFatChange: (value: string) => void
  imageUrl: string
  onClearImage: () => void
  uploading: boolean
  analyzing: boolean
  photoError: string | null
  aiNote: string | null
  onSubmit: (e: FormEvent) => void
  onPhotoPick: (file: File | undefined) => void
  onAnalyzeAgain: () => void
  onEstimateFromText: () => void
  onCancel: () => void
  footerHint?: ReactNode
}

export function MealLogSheet({
  open,
  onOpenChange,
  type,
  onTypeChange,
  name,
  onNameChange,
  calories,
  onCaloriesChange,
  protein,
  onProteinChange,
  carbs,
  onCarbsChange,
  fat,
  onFatChange,
  imageUrl,
  onClearImage,
  uploading,
  analyzing,
  photoError,
  aiNote,
  onSubmit,
  onPhotoPick,
  onAnalyzeAgain,
  onEstimateFromText,
  onCancel,
  footerHint,
}: MealLogSheetProps) {
  const photoRef = useRef<HTMLInputElement>(null)
  const busy = uploading || analyzing
  const inputClass =
    'w-full h-11 bg-muted border border-border rounded-[14px] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary'

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel()
        else onOpenChange(next)
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border border-border bg-background outline-none sm:max-w-[430px]">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />

          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <div className="min-w-0">
              <Drawer.Title className="text-base font-bold text-foreground tracking-tight">
                Log meal
              </Drawer.Title>
              <Drawer.Description className="text-[11px] text-muted-foreground">
                Photo or describe food — AI can fill macros.
              </Drawer.Description>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-border bg-card p-2 text-muted-foreground cursor-pointer active:scale-95 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3"
          >
            <div className="rounded-[20px] border border-border bg-muted/40 overflow-hidden">
              <div className="relative aspect-[16/10] bg-background">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Meal photo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Camera className="w-8 h-8 opacity-50" />
                    <p className="text-xs">Snap a photo for AI logging</p>
                  </div>
                )}
                {busy && (
                  <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-xs font-medium text-foreground">
                      {uploading ? 'Uploading photo…' : 'AI reading meal…'}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 p-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => photoRef.current?.click()}
                  className="flex-1 h-11 rounded-[14px] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-60 bg-primary text-primary-foreground"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {imageUrl ? 'Retake photo' : 'Take / choose photo'}
                </button>
                {imageUrl && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onAnalyzeAgain()}
                      className="h-11 px-3 rounded-[14px] bg-card border border-border text-primary cursor-pointer active:scale-95 disabled:opacity-60"
                      aria-label="Analyze with AI"
                      title="Analyze with AI"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onClearImage}
                      className="h-11 px-3 rounded-[14px] bg-card border border-border text-muted-foreground cursor-pointer active:scale-95 disabled:opacity-60"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  void onPhotoPick(file)
                }}
              />
            </div>

            {photoError && <p className="text-xs text-destructive px-0.5">{photoError}</p>}
            {aiNote && !photoError && (
              <p className="text-[11px] text-muted-foreground px-0.5">AI note: {aiNote}</p>
            )}

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {MEAL_TYPES.map((t) => {
                const Icon = TYPE_ICON[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTypeChange(t)}
                    className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      type === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {MEAL_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground px-0.5 -mt-1">
              Suggested from current time · change if needed
            </p>

            <div className="space-y-2">
              <textarea
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder='What did you eat? e.g. "2 eggs, 2 toast, peanut butter, banana"'
                rows={3}
                className="w-full min-h-[88px] bg-muted border border-border rounded-[14px] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y"
                required
              />
              <button
                type="button"
                disabled={busy || !name.trim()}
                onClick={() => void onEstimateFromText()}
                className="w-full h-11 rounded-[14px] bg-primary/15 border border-primary/25 text-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {analyzing && !uploading && !imageUrl ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Estimating macros…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Estimate calories with AI
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={calories}
                onChange={(e) => onCaloriesChange(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Calories"
                className={inputClass}
              />
              <input
                value={protein}
                onChange={(e) => onProteinChange(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Protein (g)"
                className={inputClass}
              />
              <input
                value={carbs}
                onChange={(e) => onCarbsChange(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Carbs (g)"
                className={inputClass}
              />
              <input
                value={fat}
                onChange={(e) => onFatChange(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Fat (g)"
                className={inputClass}
              />
            </div>

            {footerHint}

            <div className="flex gap-2 pt-1 sticky bottom-0 bg-background pb-1">
              <Button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 h-11 rounded-[14px] bg-muted text-foreground border-0"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || busy}
                className="flex-1 h-11 rounded-[14px] bg-primary text-primary-foreground font-bold border-0"
              >
                Save meal
              </Button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
