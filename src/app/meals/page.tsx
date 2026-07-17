'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import {
  Apple,
  Camera,
  Coffee,
  Cookie,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Moon,
} from 'lucide-react'
import {
  MEAL_TYPE_LABELS,
  mealTypeFromTime,
  summarizeMeals,
  todayKey,
  useMealStore,
  type MealType,
} from '@/stores/mealStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const TYPE_ICON: Record<MealType, typeof Coffee> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  dinner: Moon,
  snack: Cookie,
}

function waitForHydration() {
  return new Promise<void>((resolve) => {
    if (useMealStore.persist?.hasHydrated?.()) {
      resolve()
      return
    }
    const unsub = useMealStore.persist?.onFinishHydration?.(() => {
      unsub?.()
      resolve()
    })
    setTimeout(() => {
      unsub?.()
      resolve()
    }, 800)
  })
}

async function uploadMealPhoto(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('mealKey', `draft-${Date.now().toString(36)}`)

  const res = await fetch('/api/meals/media', {
    method: 'POST',
    body: form,
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload photo')
  }
  return data.url
}

async function analyzeMealPhoto(imageUrl: string, hint?: string) {
  const res = await fetch('/api/ai/analyze-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, hint: hint?.trim() || undefined }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    suggestion?: {
      name: string
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
      notes?: string
      confidence?: string
    }
    error?: string
  }
  if (!res.ok || !data.suggestion) {
    throw new Error(data.error || 'AI could not read this meal')
  }
  return data.suggestion
}

export default function MealsPage() {
  const meals = useMealStore((s) => s.meals)
  const dailyCalorieGoal = useMealStore((s) => s.dailyCalorieGoal)
  const dailyProteinGoal = useMealStore((s) => s.dailyProteinGoal)
  const addMeal = useMealStore((s) => s.addMeal)
  const deleteMeal = useMealStore((s) => s.deleteMeal)
  const user = useAuthStore((s) => s.user)

  const photoRef = useRef<HTMLInputElement>(null)
  const [hydrated, setHydrated] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<MealType>(() => mealTypeFromTime())
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [aiNote, setAiNote] = useState<string | null>(null)

  const date = todayKey()

  useEffect(() => {
    let cancelled = false
    waitForHydration().then(() => {
      if (!cancelled) setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const todaysMeals = useMemo(
    () => (hydrated ? meals.filter((m) => m.date === date) : []),
    [hydrated, meals, date]
  )

  const totals = useMemo(() => summarizeMeals(todaysMeals), [todaysMeals])
  const caloriePct = Math.min(100, Math.round((totals.calories / dailyCalorieGoal) * 100))
  const proteinPct = Math.min(100, Math.round((totals.proteinG / dailyProteinGoal) * 100))

  const openForm = () => {
    setType(mealTypeFromTime())
    setShowForm(true)
    setPhotoError(null)
    setAiNote(null)
  }

  const resetForm = () => {
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setImageUrl('')
    setType(mealTypeFromTime())
    setPhotoError(null)
    setAiNote(null)
    setShowForm(false)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addMeal({
      date,
      type,
      name: name.trim(),
      calories: Number(calories) || 0,
      proteinG: Number(protein) || 0,
      carbsG: Number(carbs) || 0,
      fatG: Number(fat) || 0,
      imageUrl: imageUrl || undefined,
      notes: aiNote || undefined,
    })
    resetForm()
  }

  const handlePhotoPick = async (file: File | undefined) => {
    if (!file) return
    if (!user) {
      setPhotoError('Sign in to take a photo and let AI log the meal.')
      return
    }

    setPhotoError(null)
    setAiNote(null)
    setUploading(true)
    try {
      const url = await uploadMealPhoto(file)
      setImageUrl(url)
      setType(mealTypeFromTime())

      setAnalyzing(true)
      const suggestion = await analyzeMealPhoto(url, name)
      setName(suggestion.name)
      setCalories(String(suggestion.calories))
      setProtein(String(suggestion.proteinG))
      setCarbs(String(suggestion.carbsG))
      setFat(String(suggestion.fatG))
      if (suggestion.notes) setAiNote(suggestion.notes)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Photo or AI analysis failed')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const handleAnalyzeAgain = async () => {
    if (!imageUrl || !user) return
    setPhotoError(null)
    setAnalyzing(true)
    try {
      const suggestion = await analyzeMealPhoto(imageUrl, name)
      setName(suggestion.name)
      setCalories(String(suggestion.calories))
      setProtein(String(suggestion.proteinG))
      setCarbs(String(suggestion.carbsG))
      setFat(String(suggestion.fatG))
      if (suggestion.notes) setAiNote(suggestion.notes)
      setType(mealTypeFromTime())
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'AI analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const busy = uploading || analyzing
  const inputClass =
    'w-full h-11 bg-muted border border-border rounded-[14px] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary'

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Meals</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMM d')} · track today’s fuel
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : openForm())}
          className="h-10 px-3 rounded-[14px] bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Log meal
        </button>
      </div>

      {!hydrated ? (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          <div className="h-28 rounded-[24px] bg-muted/80" />
          <div className="h-40 rounded-[24px] bg-muted/80" />
        </div>
      ) : (
        <>
          <section className="rounded-[24px] border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Apple className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Today</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Calories
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {totals.calories}
                  <span className="text-sm font-semibold text-muted-foreground">
                    {' '}
                    / {dailyCalorieGoal}
                  </span>
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${caloriePct}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Protein
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {totals.proteinG}g
                  <span className="text-sm font-semibold text-muted-foreground">
                    {' '}
                    / {dailyProteinGoal}g
                  </span>
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-warning transition-all"
                    style={{ width: `${proteinPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[14px] bg-background/50 border border-border px-3 py-2 text-center">
                <p className="text-sm font-bold text-foreground tabular-nums">{totals.carbsG}g</p>
                <p className="text-[10px] text-muted-foreground">Carbs</p>
              </div>
              <div className="rounded-[14px] bg-background/50 border border-border px-3 py-2 text-center">
                <p className="text-sm font-bold text-foreground tabular-nums">{totals.fatG}g</p>
                <p className="text-[10px] text-muted-foreground">Fat</p>
              </div>
              <div className="rounded-[14px] bg-background/50 border border-border px-3 py-2 text-center">
                <p className="text-sm font-bold text-foreground tabular-nums">{totals.count}</p>
                <p className="text-[10px] text-muted-foreground">Meals</p>
              </div>
            </div>
          </section>

          {showForm && (
            <form
              onSubmit={handleAdd}
              className="bg-card border border-border rounded-[24px] p-4 space-y-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                New meal
              </p>

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
                        onClick={() => void handleAnalyzeAgain()}
                        className="h-11 px-3 rounded-[14px] bg-card border border-border text-primary cursor-pointer active:scale-95 disabled:opacity-60"
                        aria-label="Analyze with AI"
                        title="Analyze with AI"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setImageUrl('')
                          setAiNote(null)
                        }}
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
                    void handlePhotoPick(file)
                  }}
                />
              </div>

              {photoError && (
                <p className="text-xs text-destructive px-0.5">{photoError}</p>
              )}
              {aiNote && !photoError && (
                <p className="text-[11px] text-muted-foreground px-0.5">
                  AI note: {aiNote}
                </p>
              )}

              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                {MEAL_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
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

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meal name (e.g. Chicken rice bowl)"
                className={inputClass}
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={calories}
                  onChange={(e) => setCalories(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Calories"
                  className={inputClass}
                />
                <input
                  value={protein}
                  onChange={(e) => setProtein(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Protein (g)"
                  className={inputClass}
                />
                <input
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Carbs (g)"
                  className={inputClass}
                />
                <input
                  value={fat}
                  onChange={(e) => setFat(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Fat (g)"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  onClick={resetForm}
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
          )}

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
              Logged today
            </h2>

            {todaysMeals.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border p-8 text-center space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                <p className="text-sm font-bold text-foreground">No meals yet</p>
                <p className="text-xs text-muted-foreground">
                  Snap a photo or log macros manually.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaysMeals.map((meal) => {
                  const Icon = TYPE_ICON[meal.type]
                  return (
                    <div
                      key={meal.id}
                      className="bg-card border border-border rounded-[20px] p-4 flex gap-3 items-start"
                    >
                      {meal.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={meal.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {meal.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {MEAL_TYPE_LABELS[meal.type]}
                              {' · '}
                              {format(new Date(meal.createdAt), 'h:mm a')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteMeal(meal.id)}
                            className="p-2 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
                            aria-label="Delete meal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
                          <span>
                            <span className="font-bold text-foreground">{meal.calories}</span> kcal
                          </span>
                          <span>
                            <span className="font-bold text-foreground">{meal.proteinG}g</span> P
                          </span>
                          <span>
                            <span className="font-bold text-foreground">{meal.carbsG}g</span> C
                          </span>
                          <span>
                            <span className="font-bold text-foreground">{meal.fatG}g</span> F
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
