const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

export function isEmbeddingsConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

async function callOpenAiEmbeddings(inputs: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key || inputs.length === 0) return null

  try {
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputs,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn(
        `OpenAI embeddings unavailable (${res.status}) — using text search fallback.`,
        errText.slice(0, 120)
      )
      return null
    }

    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>
    }
    const rows = [...(data.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const out: number[][] = []
    for (const row of rows) {
      if (!row.embedding || row.embedding.length !== EMBEDDING_DIMENSIONS) return null
      out.push(row.embedding)
    }
    return out
  } catch (err) {
    console.warn('OpenAI embeddings request failed — using text search fallback.', err)
    return null
  }
}

/** Returns embedding or null when OpenAI is missing/quota-limited. */
export async function embedText(text: string): Promise<number[] | null> {
  const input = text.replace(/\s+/g, ' ').trim().slice(0, 8000)
  if (!input) return null
  const batch = await callOpenAiEmbeddings([input])
  return batch?.[0] ?? null
}

/** Returns embeddings aligned to inputs, or null if any/all failed. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const inputs = texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 8000)).filter(Boolean)
  if (inputs.length === 0) return []
  return callOpenAiEmbeddings(inputs)
}

/** Format for pgvector literal: [0.1,0.2,...] */
export function embeddingToSql(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
