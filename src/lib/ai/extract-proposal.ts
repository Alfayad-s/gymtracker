import type { AgentActionName } from '@/lib/ai/agent-types'

/**
 * Extract a proposal payload from model text or Groq failed_generation dumps.
 * Supports OpenAI tool JSON, fenced JSON, and <function=name{...}> variants.
 */
export function extractProposalPayload(raw: string): {
  summary?: string
  actions?: unknown[]
} | null {
  if (!raw || typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null

  const candidates: string[] = []

  // ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) candidates.push(fence[1].trim())

  // <function=propose_gymtrack_actions{...}> or <function=name {...}>
  const fnAngle = text.match(
    /<function\s*=\s*propose_gymtrack_actions\s*(\{[\s\S]*\})\s*(?:<\/function>)?/i
  )
  if (fnAngle?.[1]) candidates.push(fnAngle[1].trim())

  // propose_gymtrack_actions({...})
  const fnCall = text.match(/propose_gymtrack_actions\s*\(\s*(\{[\s\S]*\})\s*\)/i)
  if (fnCall?.[1]) candidates.push(fnCall[1].trim())

  // Whole-object JSON
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1))
  }

  candidates.push(text)

  for (const candidate of candidates) {
    const parsed = tryParseJsonObject(candidate)
    if (!parsed) continue

    // Direct proposal shape
    if (Array.isArray(parsed.actions)) {
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
        actions: parsed.actions,
      }
    }

    // Nested { proposal: { actions } }
    if (
      parsed.proposal &&
      typeof parsed.proposal === 'object' &&
      Array.isArray((parsed.proposal as { actions?: unknown }).actions)
    ) {
      const proposal = parsed.proposal as { summary?: string; actions: unknown[] }
      return {
        summary: typeof proposal.summary === 'string' ? proposal.summary : undefined,
        actions: proposal.actions,
      }
    }

    // Single action shorthand { action, params }
    if (typeof parsed.action === 'string') {
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
        actions: [{ action: parsed.action, params: parsed.params ?? {} }],
      }
    }
  }

  return null
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  try {
    // Models sometimes emit single quotes
    const normalized = text.replace(/'/g, '"')
    const value = JSON.parse(normalized) as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  } catch {
    // try fixing trailing commas
    try {
      const fixed = text.replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"')
      const value = JSON.parse(fixed) as unknown
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

export function looksLikeMutationIntent(text: string): boolean {
  return /\b(create|add|update|edit|delete|remove|change|set|start|finish|log|save|rename|build|schedule|plan)\b/i.test(
    text
  )
}

export function isKnownActionName(name: unknown): name is AgentActionName {
  return typeof name === 'string'
}
