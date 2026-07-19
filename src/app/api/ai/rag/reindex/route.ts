import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isEmbeddingsConfigured } from '@/lib/ai/embeddings'
import { indexDocument, indexPlainDocument } from '@/lib/ai/rag'
import {
  formatBodyCompositionChunk,
  formatMealChunk,
  formatWorkoutChunk,
} from '@/lib/ai/rag/formatters'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'
export const maxDuration = 120

type ReindexBody = {
  scope?: 'me' | 'knowledge' | 'item'
  /** When scope=item */
  item?: {
    sourceType: 'workout' | 'meal' | 'body_composition' | 'exercise' | 'pr' | 'knowledge'
    sourceId: string
    title?: string
    content?: string
    metadata?: Record<string, unknown>
    /** Structured payloads for common sources */
    workout?: Parameters<typeof formatWorkoutChunk>[0]
    meal?: Parameters<typeof formatMealChunk>[0]
    bodyComposition?: Parameters<typeof formatBodyCompositionChunk>[0]
  }
}

/**
 * POST /api/ai/rag/reindex
 * - scope=knowledge: re-seed global fitness markdown (server only; any authenticated user can trigger read-only knowledge refresh)
 * - scope=item: index one personal document for the current user
 * - scope=me: reserved — returns hint (full history reindex is client-driven via item posts)
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isEmbeddingsConfigured()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured — RAG indexing disabled' },
      { status: 503 }
    )
  }

  let body: ReindexBody
  try {
    body = (await request.json()) as ReindexBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const scope = body.scope ?? 'item'

  try {
    if (scope === 'knowledge') {
      const dir = path.join(process.cwd(), 'content/fitness-knowledge')
      const files = (await readdir(dir)).filter((f) => f.endsWith('.md'))
      let indexed = 0
      for (const file of files) {
        const slug = file.replace(/\.md$/i, '')
        const raw = await readFile(path.join(dir, file), 'utf8')
        const titleMatch = raw.match(/^#\s+(.+)$/m)
        const title = titleMatch?.[1]?.trim() || slug
        const result = await indexPlainDocument({
          userId: null,
          sourceType: 'knowledge',
          sourceId: slug,
          title,
          content: raw,
          metadata: { slug, kind: 'knowledge', file },
        })
        indexed += result.indexed
      }
      return NextResponse.json({ ok: true, scope, indexed, files: files.length })
    }

    if (scope === 'me') {
      return NextResponse.json({
        ok: true,
        scope,
        message:
          'Full personal reindex is driven by posting scope=item for each workout/meal/report as they are saved.',
      })
    }

    const item = body.item
    if (!item?.sourceType || !item.sourceId) {
      return NextResponse.json(
        { error: 'item.sourceType and item.sourceId are required' },
        { status: 400 }
      )
    }

    if (item.sourceType === 'knowledge') {
      return NextResponse.json(
        { error: 'Use scope=knowledge to reindex global docs' },
        { status: 400 }
      )
    }

    if (item.workout) {
      const chunk = formatWorkoutChunk(item.workout)
      const result = await indexDocument({
        userId: user.id,
        sourceType: 'workout',
        sourceId: item.sourceId,
        chunks: [chunk],
      })
      return NextResponse.json({ ok: true, scope: 'item', ...result })
    }

    if (item.meal) {
      const chunk = formatMealChunk(item.meal)
      const result = await indexDocument({
        userId: user.id,
        sourceType: 'meal',
        sourceId: item.sourceId,
        chunks: [chunk],
      })
      return NextResponse.json({ ok: true, scope: 'item', ...result })
    }

    if (item.bodyComposition) {
      const chunk = formatBodyCompositionChunk(item.bodyComposition)
      const result = await indexDocument({
        userId: user.id,
        sourceType: 'body_composition',
        sourceId: item.sourceId,
        chunks: [chunk],
      })
      return NextResponse.json({ ok: true, scope: 'item', ...result })
    }

    if (!item.content) {
      return NextResponse.json({ error: 'item.content or structured payload required' }, { status: 400 })
    }

    const result = await indexPlainDocument({
      userId: user.id,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      title: item.title || item.sourceType,
      content: item.content,
      metadata: item.metadata,
    })
    return NextResponse.json({ ok: true, scope: 'item', ...result })
  } catch (error) {
    console.error('RAG reindex failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reindex failed' },
      { status: 503 }
    )
  }
}
