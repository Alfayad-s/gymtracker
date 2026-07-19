import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { embedText, embeddingToSql } from '@/lib/ai/embeddings'
import { getRagTopK, type RetrievedChunk, type RagSourceType } from './types'

function mapRows(list: Array<Record<string, unknown>>): RetrievedChunk[] {
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
}

function asRowList(rows: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>
  return ((rows as { rows?: Array<Record<string, unknown>> }).rows ?? [])
}

/** Full-text search fallback (works without OpenAI / embeddings). */
async function retrieveViaFts(params: {
  userId: string
  query: string
  topK: number
}): Promise<RetrievedChunk[]> {
  const q = params.query.trim()
  if (!q) return []

  try {
    const rows = await db.execute(sql`
      select
        id::text as id,
        title,
        content,
        source_type as "sourceType",
        source_id as "sourceId",
        metadata,
        ts_rank(
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')),
          websearch_to_tsquery('english', ${q})
        )::float8 as score
      from ai_documents
      where (user_id = ${params.userId}::uuid or user_id is null)
        and (
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
          @@ websearch_to_tsquery('english', ${q})
          or title ilike ${'%' + q.slice(0, 80) + '%'}
          or content ilike ${'%' + q.slice(0, 80) + '%'}
        )
      order by score desc, updated_at desc
      limit ${params.topK}
    `)
    return mapRows(asRowList(rows))
  } catch (err) {
    console.warn('RAG FTS retrieve failed:', err)
    // Last resort: recent docs matching any token via ilike
    try {
      const token = q.split(/\s+/).find((t) => t.length > 2) ?? q.slice(0, 40)
      const rows = await db.execute(sql`
        select
          id::text as id,
          title,
          content,
          source_type as "sourceType",
          source_id as "sourceId",
          metadata,
          0.1::float8 as score
        from ai_documents
        where (user_id = ${params.userId}::uuid or user_id is null)
          and (
            title ilike ${'%' + token + '%'}
            or content ilike ${'%' + token + '%'}
          )
        order by updated_at desc
        limit ${params.topK}
      `)
      return mapRows(asRowList(rows))
    } catch (err2) {
      console.warn('RAG ilike fallback failed:', err2)
      return []
    }
  }
}

export async function retrieveRagChunks(params: {
  userId: string
  query: string
  topK?: number
}): Promise<RetrievedChunk[]> {
  const query = params.query.trim()
  if (!query) return []

  const topK = params.topK ?? getRagTopK()

  // Prefer vector search when embeddings are available
  const embedding = await embedText(query)
  if (embedding) {
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
      const mapped = mapRows(asRowList(rows))
      if (mapped.length > 0) return mapped
    } catch (err) {
      console.warn('RAG vector retrieve failed, falling back to FTS:', err)
    }
  }

  return retrieveViaFts({ userId: params.userId, query, topK })
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
