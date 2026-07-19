/**
 * Client helper — fire-and-forget personal RAG indexing.
 * Safe to call when OPENAI_API_KEY is unset (server returns 503; ignored).
 */
export function indexRagSource(payload: {
  sourceType: 'workout' | 'meal' | 'body_composition' | 'exercise' | 'pr'
  sourceId: string
  workout?: {
    id: string
    name: string
    completedAt?: string | null
    startedAt?: string | null
    durationMinutes?: number | null
    volumeKg?: number | null
    totalSets?: number | null
    exercises?: Array<{
      name: string
      sets?: number
      bestSet?: string
      loggedSets?: Array<{ weight: number; reps: number; setNumber?: number }>
    }>
  }
  meal?: {
    id: string
    name?: string | null
    description?: string | null
    mealType?: string | null
    loggedAt?: string | null
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
  }
  bodyComposition?: {
    id: string
    reportDate: string
    weight?: number | null
    bodyFatPercent?: number | null
    skeletalMuscleMass?: number | null
    bmi?: number | null
    bodyScore?: number | null
    visceralFat?: number | null
    bmr?: number | null
  }
  title?: string
  content?: string
  metadata?: Record<string, unknown>
}) {
  if (typeof window === 'undefined') return

  void fetch('/api/ai/rag/reindex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'item',
      item: {
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        workout: payload.workout,
        meal: payload.meal,
        bodyComposition: payload.bodyComposition,
        title: payload.title,
        content: payload.content,
        metadata: payload.metadata,
      },
    }),
  }).catch(() => {
    // non-blocking
  })
}
