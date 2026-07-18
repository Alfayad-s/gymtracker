'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SUGGESTIONS = [
  'Why is my body fat high?',
  'Should I bulk?',
  'Should I cut?',
  'How can I gain muscle?',
  'Why is my body score low?',
  'Why is my BMR low?',
  'How much protein should I eat?',
  'Which muscle is lagging?',
]

type Msg = { role: 'user' | 'assistant'; content: string }

export function AiCoachChat({ reportId }: { reportId: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || loading) return
    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/body-composition/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, reportId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        answer?: string
        error?: string
      }
      if (!res.ok || !data.answer) throw new Error(data.error || 'Coach failed')
      setMessages((m) => [...m, { role: 'assistant', content: data.answer! }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coach unavailable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/60 backdrop-blur-md p-4 space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        AI Coach
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => void ask(s)}
            className="h-8 px-2.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Ask anything about your latest report.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-[14px] px-3 py-2 text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary/15 text-foreground ml-6'
                : 'bg-muted text-foreground mr-6'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ask(input)
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach…"
          className="flex-1 h-11 bg-muted border border-border rounded-[14px] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-11 w-11 rounded-[14px] bg-primary text-primary-foreground border-0 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
