import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  AGENT_SYSTEM_PROMPT,
  JSON_FALLBACK_PROMPT,
  PROPOSE_ACTIONS_TOOL,
} from '@/lib/ai/agent-tools'
import type { AgentContext } from '@/lib/ai/agent-types'
import { leanContextForModel } from '@/lib/ai/lean-context'
import {
  completeGroqAgentChat,
  completeGroqTextChat,
  getFailedGeneration,
  isRateLimitError,
  type GroqMessage,
} from '@/lib/groq'
import { extractProposalPayload, looksLikeMutationIntent } from '@/lib/ai/extract-proposal'
import { validateRawProposal } from '@/lib/ai/validate-proposal'
import { formatRagContextBlock, retrieveRagChunks } from '@/lib/ai/rag'

type ChatRequest = {
  messages?: GroqMessage[]
  context?: AgentContext
}

function cleanMessages(messages: GroqMessage[] | undefined): GroqMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .filter(
      (message): message is GroqMessage & { content: string } =>
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1500),
    }))
}

function sanitizeContext(context: unknown): AgentContext | null {
  if (!context || typeof context !== 'object') return null
  const c = context as AgentContext
  if (!c.generatedAt || !Array.isArray(c.plans) || !Array.isArray(c.exerciseCatalog)) {
    return null
  }
  if (!Array.isArray(c.historyIds)) return null
  return c
}

function buildContextBlock(context: AgentContext) {
  const lean = leanContextForModel(context)
  const latestCustom = lean.customExercises[0]
  const hint = latestCustom
    ? `\nLatest custom exercise (for "that/this/it"): id=${latestCustom.id}, name="${latestCustom.name}".`
    : '\nNo custom exercises yet.'
  const cal = lean.calendar
  const planHint = lean.activePlanId
    ? `\nActive plan: ${lean.activePlanId}. Calendar: today=${cal.todayName} (${cal.todayWeekday}), tomorrow=${cal.tomorrowName} (${cal.tomorrowWeekday}). For "create workout for tomorrow/Monday", propose add_plan_day + add_exercise_to_day using catalog ids and recovery.`
    : `\nNo plans yet — create_plan first if the user wants a day workout. Calendar: today=${cal.todayName} (${cal.todayWeekday}), tomorrow=${cal.tomorrowName} (${cal.tomorrowWeekday}).`

  return `GymTrack app snapshot (compact):${hint}${planHint}\n${JSON.stringify(lean)}`
}

function friendlyAiError(error: unknown): string {
  if (isRateLimitError(error)) {
    return 'AI is busy right now (rate limit). Wait a few seconds and try again.'
  }
  if (error instanceof Error && error.message) {
    if (/tokens per minute|tpm|rate limit|429/i.test(error.message)) {
      return 'AI is busy right now (rate limit). Wait a few seconds and try again.'
    }
    if (error.message.length > 180) {
      return 'AI is unavailable right now. Please try again.'
    }
    return error.message
  }
  return 'AI is unavailable right now. Please try again.'
}

function proposalResponse(
  raw: { summary?: string; actions?: unknown[] },
  context: AgentContext,
  assistantText?: string | null,
  ragHits = 0
) {
  const validated = validateRawProposal(raw, context)
  if (!validated.ok) {
    return NextResponse.json({
      message: {
        role: 'assistant',
        content:
          assistantText?.trim() ||
          `I couldn't apply that change (${validated.error}). Try naming the exercise/plan and the create/update/delete action clearly.`,
      },
      ragHits,
    })
  }

  return NextResponse.json({
    message: {
      role: 'assistant',
      content: assistantText?.trim() || validated.proposal.summary,
      proposal: validated.proposal,
    },
    ragHits,
  })
}

async function jsonFallbackResponse(
  systemMessages: GroqMessage[],
  userMessages: GroqMessage[],
  context: AgentContext,
  lastUserText: string,
  ragHits = 0
) {
  const text = await completeGroqTextChat([
    ...systemMessages,
    ...userMessages,
    { role: 'system', content: JSON_FALLBACK_PROMPT },
  ])

  const extracted = extractProposalPayload(text)
  if (extracted?.actions) {
    return proposalResponse(extracted, context, null, ragHits)
  }

  if (looksLikeMutationIntent(lastUserText) && !extracted) {
    const latest = context.customExercises[0]
    return NextResponse.json({
      message: {
        role: 'assistant',
        content:
          text.trim() ||
          (latest
            ? `I can update "${latest.name}" if you confirm. Say something like: "Update ${latest.name} with these steps: …"`
            : 'Tell me what to create, update, or delete (include the exercise/plan name).'),
      },
      ragHits,
    })
  }

  return NextResponse.json({
    message: { role: 'assistant', content: text.trim() || 'How can I help with your training?' },
    ragHits,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatRequest
  try {
    body = (await request.json()) as ChatRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userMessages = cleanMessages(body.messages)
  if (userMessages.length === 0 || userMessages[userMessages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Send a user message first' }, { status: 400 })
  }

  const context = sanitizeContext(body.context)
  if (!context) {
    return NextResponse.json({ error: 'App context is required' }, { status: 400 })
  }

  const systemMessages: GroqMessage[] = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
    { role: 'system', content: buildContextBlock(context) },
  ]
  const lastContent = userMessages[userMessages.length - 1]?.content
  const lastUserText = typeof lastContent === 'string' ? lastContent : ''

  let ragHitCount = 0
  try {
    const chunks = await retrieveRagChunks({ userId: user.id, query: lastUserText })
    ragHitCount = chunks.length
    const ragBlock = formatRagContextBlock(chunks)
    if (ragBlock) {
      systemMessages.push({ role: 'system', content: ragBlock })
    }
  } catch (err) {
    console.warn('RAG retrieval skipped:', err)
  }

  try {
    const result = await completeGroqAgentChat(
      [...systemMessages, ...userMessages],
      [PROPOSE_ACTIONS_TOOL]
    )

    if (result.kind === 'text') {
      const embedded = extractProposalPayload(result.content)
      if (embedded?.actions && looksLikeMutationIntent(lastUserText)) {
        return proposalResponse(embedded, context, null, ragHitCount)
      }
      return NextResponse.json({
        message: { role: 'assistant', content: result.content },
        ragHits: ragHitCount,
      })
    }

    if (result.toolName !== 'propose_gymtrack_actions') {
      return jsonFallbackResponse(systemMessages, userMessages, context, lastUserText, ragHitCount)
    }

    let parsedArgs: { summary?: string; actions?: unknown[] } | null = null
    try {
      parsedArgs = JSON.parse(result.arguments) as { summary?: string; actions?: unknown[] }
    } catch {
      parsedArgs = extractProposalPayload(result.arguments)
    }

    if (!parsedArgs) {
      return jsonFallbackResponse(systemMessages, userMessages, context, lastUserText, ragHitCount)
    }

    return proposalResponse(parsedArgs, context, result.assistantText, ragHitCount)
  } catch (error) {
    console.error('AI chat failed:', error)

    const failedGeneration = getFailedGeneration(error)
    if (failedGeneration) {
      const salvaged = extractProposalPayload(failedGeneration)
      if (salvaged?.actions) {
        return proposalResponse(salvaged, context, null, ragHitCount)
      }
    }

    if (isRateLimitError(error)) {
      return NextResponse.json({ error: friendlyAiError(error) }, { status: 429 })
    }

    try {
      return await jsonFallbackResponse(
        systemMessages,
        userMessages,
        context,
        lastUserText,
        ragHitCount
      )
    } catch (fallbackError) {
      console.error('AI JSON fallback failed:', fallbackError)
      return NextResponse.json(
        { error: friendlyAiError(isRateLimitError(fallbackError) ? fallbackError : error) },
        { status: isRateLimitError(fallbackError) ? 429 : 503 }
      )
    }
  }
}
