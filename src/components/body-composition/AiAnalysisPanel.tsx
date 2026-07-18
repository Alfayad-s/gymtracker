'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AiAnalysisPanel({
  reportId,
  initialAnalysis,
  onAnalysis,
}: {
  reportId: string
  initialAnalysis?: string | null
  onAnalysis?: (text: string) => void
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/body-composition/ai/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        analysis?: string
        error?: string
      }
      if (!res.ok || !data.analysis) throw new Error(data.error || 'Analysis failed')
      setAnalysis(data.analysis)
      onAnalysis?.(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/60 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider">AI Analysis</h3>
        </div>
        <Button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="h-9 px-3 rounded-[12px] bg-primary text-primary-foreground text-xs font-bold border-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Generate'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {analysis ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {analysis}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Generate a personalized health, training, and nutrition breakdown from this report.
        </p>
      )}
    </div>
  )
}
