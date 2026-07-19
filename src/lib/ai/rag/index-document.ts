import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { aiDocuments } from '@/db/schema'
import { embedTexts, embeddingToSql } from '@/lib/ai/embeddings'
import { chunkText, type RagChunkInput, type RagSourceType } from './types'

export async function deleteDocumentsForSource(params: {
  userId: string | null
  sourceType: RagSourceType
  sourceId: string
}) {
  if (params.userId == null) {
    await db
      .delete(aiDocuments)
      .where(
        and(
          isNull(aiDocuments.userId),
          eq(aiDocuments.sourceType, params.sourceType),
          eq(aiDocuments.sourceId, params.sourceId)
        )
      )
    return
  }

  await db
    .delete(aiDocuments)
    .where(
      and(
        eq(aiDocuments.userId, params.userId),
        eq(aiDocuments.sourceType, params.sourceType),
        eq(aiDocuments.sourceId, params.sourceId)
      )
    )
}

/**
 * Replace all chunks for a source.
 * Always stores text (FTS works without OpenAI). Embeddings are best-effort.
 */
export async function indexDocument(params: {
  userId: string | null
  sourceType: RagSourceType
  sourceId: string
  chunks: RagChunkInput[]
}): Promise<{ indexed: number; embedded: number }> {
  const prepared = params.chunks
    .map((c) => ({
      title: c.title.trim().slice(0, 200),
      content: c.content.trim(),
      metadata: c.metadata ?? {},
    }))
    .filter((c) => c.content.length > 0)

  await deleteDocumentsForSource({
    userId: params.userId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
  })

  if (prepared.length === 0) return { indexed: 0, embedded: 0 }

  const expanded: Array<{
    title: string
    content: string
    metadata: Record<string, unknown>
    chunkIndex: number
  }> = []
  let idx = 0
  for (const item of prepared) {
    const parts = chunkText(item.content)
    for (const part of parts) {
      expanded.push({
        title: item.title,
        content: part,
        metadata: item.metadata,
        chunkIndex: idx++,
      })
    }
  }

  const embeddings = await embedTexts(expanded.map((e) => `${e.title}\n${e.content}`))
  let embedded = 0

  for (let i = 0; i < expanded.length; i++) {
    const row = expanded[i]!
    const embedding = embeddings?.[i] ?? null
    const embeddingSql = embedding
      ? sql.raw(`'${embeddingToSql(embedding)}'::vector`)
      : sql`null`
    if (embedding) embedded += 1

    if (params.userId == null) {
      await db.execute(sql`
        insert into ai_documents (
          user_id, source_type, source_id, chunk_index, title, content, metadata, embedding
        ) values (
          null,
          ${params.sourceType},
          ${params.sourceId},
          ${row.chunkIndex},
          ${row.title},
          ${row.content},
          ${JSON.stringify(row.metadata)},
          ${embeddingSql}
        )
      `)
    } else {
      await db.execute(sql`
        insert into ai_documents (
          user_id, source_type, source_id, chunk_index, title, content, metadata, embedding
        ) values (
          ${params.userId}::uuid,
          ${params.sourceType},
          ${params.sourceId},
          ${row.chunkIndex},
          ${row.title},
          ${row.content},
          ${JSON.stringify(row.metadata)},
          ${embeddingSql}
        )
      `)
    }
  }

  return { indexed: expanded.length, embedded }
}

export async function indexPlainDocument(params: {
  userId: string | null
  sourceType: RagSourceType
  sourceId: string
  title: string
  content: string
  metadata?: Record<string, unknown>
}) {
  return indexDocument({
    userId: params.userId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    chunks: [
      {
        title: params.title,
        content: params.content,
        metadata: params.metadata,
      },
    ],
  })
}
