const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

export function isEmbeddingsConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set — required for RAG embeddings')
  }

  const input = text.replace(/\s+/g, ' ').trim().slice(0, 8000)
  if (!input) {
    throw new Error('Cannot embed empty text')
  }

  const res = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(
      `OpenAI embeddings failed (${res.status}): ${errText.slice(0, 200) || res.statusText}`
    )
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const embedding = data.data?.[0]?.embedding
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error('Invalid embedding response from OpenAI')
  }
  return embedding
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set — required for RAG embeddings')
  }

  const inputs = texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 8000)).filter(Boolean)
  if (inputs.length === 0) return []

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
    throw new Error(
      `OpenAI embeddings failed (${res.status}): ${errText.slice(0, 200) || res.statusText}`
    )
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>
  }
  const rows = [...(data.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  return rows.map((row) => {
    if (!row.embedding || row.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error('Invalid embedding batch response from OpenAI')
    }
    return row.embedding
  })
}

/** Format for pgvector literal: [0.1,0.2,...] */
export function embeddingToSql(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
