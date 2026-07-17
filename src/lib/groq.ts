import 'server-only'

type GroqRole = 'system' | 'user' | 'assistant' | 'tool'

export type GroqMessage = {
  role: GroqRole
  content: string
  tool_call_id?: string
}

export type GroqToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type GroqAssistantMessage = {
  role: 'assistant'
  content: string | null
  tool_calls?: GroqToolCall[]
}

type GroqChatResponse = {
  choices?: Array<{
    message?: GroqAssistantMessage
    finish_reason?: string
  }>
  error?: {
    message?: string
    type?: string
    code?: string
    failed_generation?: string | Record<string, unknown>
  }
}

export type GroqChatResult =
  | { kind: 'text'; content: string }
  | { kind: 'tool_call'; toolName: string; arguments: string; assistantText: string | null }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama-3.1-8b-instant'
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])
const KEY_COOLDOWN_MS = 60_000
const keyCooldownUntil = new Map<string, number>()

function getGroqKeys() {
  return (process.env.GROQ_API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
}

function getStartIndex(keysLength: number) {
  if (keysLength <= 1) return 0
  return Math.floor(Math.random() * keysLength)
}

function isKeyCoolingDown(key: string) {
  return (keyCooldownUntil.get(key) ?? 0) > Date.now()
}

function coolDownKey(key: string) {
  keyCooldownUntil.set(key, Date.now() + KEY_COOLDOWN_MS)
}

function isToolUseFailure(message: string) {
  return /tool call validation failed|did not match schema|failed to call a function|tool_use_failed|failed_generation/i.test(
    message
  )
}

function isTpmOrRateLimitMessage(message: string) {
  return /tokens per minute|tpm|rate limit|too many requests|429/i.test(message)
}

export function isRateLimitError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error) return isTpmOrRateLimitMessage(error.message)
  if (typeof error === 'string') return isTpmOrRateLimitMessage(error)
  return false
}

function stringifyFailedGeneration(
  value: string | Record<string, unknown> | undefined
): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

async function callGroq(params: {
  apiKey: string
  messages: GroqMessage[]
  tools?: unknown[]
  toolChoice?: 'auto' | 'none'
  temperature?: number
  signal: AbortSignal
}) {
  const body: Record<string, unknown> = {
    model: process.env.GROQ_MODEL || DEFAULT_MODEL,
    messages: params.messages,
    temperature: params.temperature ?? 0.45,
    max_tokens: 1400,
  }
  if (params.tools?.length) {
    body.tools = params.tools
    body.tool_choice = params.toolChoice ?? 'auto'
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: params.signal,
  })

  const data = (await response.json().catch(() => ({}))) as GroqChatResponse
  return { response, data }
}

function parseGroqResult(data: GroqChatResponse): GroqChatResult {
  const message = data.choices?.[0]?.message
  if (!message) throw new Error('Groq returned an empty response')

  const toolCall = message.tool_calls?.[0]
  if (toolCall?.function?.name) {
    return {
      kind: 'tool_call',
      toolName: toolCall.function.name,
      arguments: toolCall.function.arguments ?? '{}',
      assistantText: message.content?.trim() || null,
    }
  }

  const content = message.content?.trim()
  if (!content) throw new Error('Groq returned an empty response')
  return { kind: 'text', content }
}

type RunOptions = {
  tools?: unknown[]
  toolChoice?: 'auto' | 'none'
  temperature?: number
  allowToolFallback?: boolean
}

async function runGroqChat(
  messages: GroqMessage[],
  options: RunOptions = {}
): Promise<GroqChatResult & { failedGeneration?: string | null }> {
  const keys = getGroqKeys()
  if (keys.length === 0) {
    throw new Error('GROQ_API_KEYS is not configured')
  }

  const startIndex = getStartIndex(keys.length)
  let lastError = 'Groq request failed'
  let failedGeneration: string | null = null
  let sawToolSchemaError = false

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const key = keys[(startIndex + attempt) % keys.length]
    if (isKeyCoolingDown(key) && keys.some((candidate) => !isKeyCoolingDown(candidate))) {
      continue
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    try {
      const { response, data } = await callGroq({
        apiKey: key,
        messages,
        tools: options.tools,
        toolChoice: options.toolChoice,
        temperature: options.temperature,
        signal: controller.signal,
      })

      if (response.ok) {
        return parseGroqResult(data)
      }

      lastError = data.error?.message || `Groq error ${response.status}`
      failedGeneration = stringifyFailedGeneration(data.error?.failed_generation)

      if (isToolUseFailure(lastError) || data.error?.code === 'tool_use_failed') {
        sawToolSchemaError = true
        break
      }
      if (response.status === 429 || isTpmOrRateLimitMessage(lastError)) {
        coolDownKey(key)
        // TPM / rate limit — try next API key; don't treat as hard non-retryable
        continue
      }

      if (!RETRYABLE_STATUS.has(response.status)) {
        const err = new Error(lastError) as Error & { failedGeneration?: string | null }
        err.failedGeneration = failedGeneration
        throw err
      }
    } catch (error) {
      if (error instanceof Error && (error as { failedGeneration?: string }).failedGeneration) {
        throw error
      }
      lastError =
        error instanceof Error && error.name === 'AbortError'
          ? 'Groq request timed out'
          : error instanceof Error
            ? error.message
            : lastError
      if (isToolUseFailure(lastError)) {
        sawToolSchemaError = true
        break
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  if (
    sawToolSchemaError &&
    options.allowToolFallback !== false &&
    options.tools?.length &&
    options.toolChoice !== 'none'
  ) {
    // Retry once colder — often fixes flaky tool JSON.
    try {
      const colder = await runGroqChat(messages, {
        ...options,
        temperature: Math.max(0.1, (options.temperature ?? 0.3) - 0.15),
        allowToolFallback: false,
      })
      return colder
    } catch {
      // continue to surface failed generation
    }
  }

  const err = new Error(lastError) as Error & { failedGeneration?: string | null }
  err.failedGeneration = failedGeneration
  throw err
}

/** Legacy text-only completion. */
export async function completeGroqChat(messages: GroqMessage[]) {
  const result = await runGroqChat(messages, { toolChoice: 'none', temperature: 0.55 })
  if (result.kind !== 'text') {
    throw new Error('Expected text response from Groq')
  }
  return result.content
}

/** Agent chat with optional tool calling. */
export async function completeGroqAgentChat(
  messages: GroqMessage[],
  tools: unknown[]
): Promise<GroqChatResult> {
  return runGroqChat(messages, {
    tools,
    toolChoice: 'auto',
    temperature: 0.2,
    allowToolFallback: true,
  })
}

/** Plain text completion used when tool calling fails. */
export async function completeGroqTextChat(messages: GroqMessage[]) {
  const result = await runGroqChat(messages, {
    toolChoice: 'none',
    temperature: 0.25,
    allowToolFallback: false,
  })
  if (result.kind === 'text') return result.content
  // Unexpected tool call without tools — treat content if any
  if (result.kind === 'tool_call') {
    return result.arguments || result.assistantText || ''
  }
  return ''
}

export function getFailedGeneration(error: unknown): string | null {
  if (error && typeof error === 'object' && 'failedGeneration' in error) {
    const value = (error as { failedGeneration?: string | null }).failedGeneration
    return value ?? null
  }
  return null
}
