import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { embedText, embeddingToSql, isEmbeddingsConfigured } from '@/lib/ai/embeddings'
import { getRagTopK, type RetrievedChunk, type RagSourceType } from './types'

export async function retrieveRagChunks(params: {
  userId: string
  query: string
  topK?: number
}): Promise<RetrievedChunk[]> {
  if (!isEmbeddingsConfigured()) return []

  const query = params.query.trim()
  if (!query) return []

  const topK = params.topK ?? getRagTopK()
  let embedding: number[]
  try {
    embedding = await embedText(query)
  } catch (err) {
    console.warn('RAG embed query failed:', err)
    return []
  }

  const vectorSql = sql.raw(`'${embeddingToSql(embedding)}'::vector`)

  try {
    const rows = await db.execute(sql`
      select
        id::text as id,
        title,
        content,
        source_type as "sourceType",
        source_id as "sourceId",
        metadata,
        (1 - (embedding <=> ${vectorSql}))::float8 as score
      from ai_documents
      where embedding is not null
        and (user_id = ${params.userId}::uuid or user_id is null)
      order by embedding <=> ${vectorSql}
      limit ${topK}
    `)

    const list = Array.isArray(rows)
      ? (rows as unknown as Array<Record<string, unknown>>)
      : ((rows as { rows?: Array<Record<string, unknown>> }).rows ?? [])
    return list.map((row) => {
      let metadata: Record<string, unknown> | null = null
      if (typeof row.metadata === 'string' && row.metadata) {
        try {
          metadata = JSON.parse(row.metadata) as Record<string, unknown>
        } catch {
          metadata = null
        }
      }
      return {
        id: String(row.id),
        title: String(row.title ?? ''),
        content: String(row.content ?? ''),
        sourceType: String(row.sourceType ?? 'knowledge') as RagSourceType,
        sourceId: row.sourceId != null ? String(row.sourceId) : null,
        score: typeof row.score === 'number' ? row.score : Number(row.score) || 0,
        metadata,
      }
    })
  } catch (err) {
    console.warn('RAG retrieve failed (is pgvector migration applied?):', err)
    return []
  }
}

/** Build a compact prompt block; caps total size for Groq TPM. */
export function formatRagContextBlock(chunks: RetrievedChunk[], maxChars = 2800): string {
  if (chunks.length === 0) return ''

  const lines: string[] = ['Retrieved memory (use if relevant; cite dates/sources):']
  let used = lines[0].length

  for (const chunk of chunks) {
    const tag = chunk.sourceType
    const date =
      typeof chunk.metadata?.date === 'string'
        ? ` ${chunk.metadata.date}`
        : chunk.sourceId
          ? ` ${chunk.sourceId}`
          : ''
    const line = `- [${tag}${date}] ${chunk.title}: ${chunk.content}`
    if (used + line.length + 1 > maxChars) break
    lines.push(line.slice(0, 600))
    used += line.length + 1
  }

  return lines.join('\n')
}
