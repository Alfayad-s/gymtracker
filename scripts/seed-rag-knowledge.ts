/**
 * Seed global fitness-knowledge documents into ai_documents (RAG).
 * Requires: DATABASE_URL, OPENAI_API_KEY, and pgvector migration applied.
 *
 * Usage: npx tsx scripts/seed-rag-knowledge.ts
 */
import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { indexPlainDocument, isEmbeddingsConfigured } from '../src/lib/ai/rag'

async function main() {
  if (!isEmbeddingsConfigured()) {
    console.error('OPENAI_API_KEY is required to seed RAG knowledge.')
    process.exit(1)
  }

  const dir = path.join(process.cwd(), 'content/fitness-knowledge')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'))
  if (files.length === 0) {
    console.error('No markdown files in content/fitness-knowledge')
    process.exit(1)
  }

  let total = 0
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
    console.log(`Indexed knowledge:${slug} → ${result.indexed} chunk(s)`)
    total += result.indexed
  }

  console.log(`Done. Indexed ${total} knowledge chunk(s) from ${files.length} file(s).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
