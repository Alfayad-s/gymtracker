/**
 * Seed global fitness-knowledge documents into ai_documents (RAG).
 * Works without OpenAI (stores text for Postgres full-text search).
 * If OPENAI_API_KEY is valid, also stores vector embeddings.
 *
 * Usage: npx tsx scripts/seed-rag-knowledge.ts
 */
import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { indexPlainDocument } from '../src/lib/ai/rag'

async function main() {
  const dir = path.join(process.cwd(), 'content/fitness-knowledge')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'))
  if (files.length === 0) {
    console.error('No markdown files in content/fitness-knowledge')
    process.exit(1)
  }

  let total = 0
  let embedded = 0
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
    console.log(
      `Indexed knowledge:${slug} → ${result.indexed} chunk(s)` +
        (result.embedded ? ` (${result.embedded} with embeddings)` : ' (text/FTS only)')
    )
    total += result.indexed
    embedded += result.embedded
  }

  console.log(
    `Done. Indexed ${total} knowledge chunk(s) from ${files.length} file(s)` +
      (embedded ? `; ${embedded} embedded.` : '. Embeddings skipped (no OpenAI quota / key).')
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
