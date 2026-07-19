export type RagSourceType =
  | 'workout'
  | 'meal'
  | 'body_composition'
  | 'exercise'
  | 'knowledge'
  | 'pr'

export type RagChunkInput = {
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export type RetrievedChunk = {
  id: string
  title: string
  content: string
  sourceType: RagSourceType | string
  sourceId: string | null
  score: number
  metadata: Record<string, unknown> | null
}

export function getRagTopK() {
  const n = Number(process.env.RAG_TOP_K ?? 6)
  return Number.isFinite(n) && n > 0 ? Math.min(12, Math.floor(n)) : 6
}

/** Split long text into ~800 char chunks with overlap. */
export function chunkText(text: string, maxLen = 800, overlap = 80): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim()
  if (!cleaned) return []
  if (cleaned.length <= maxLen) return [cleaned]

  const chunks: string[] = []
  let start = 0
  while (start < cleaned.length) {
    let end = Math.min(cleaned.length, start + maxLen)
    if (end < cleaned.length) {
      const breakAt = cleaned.lastIndexOf('\n', end)
      if (breakAt > start + maxLen * 0.4) end = breakAt
    }
    chunks.push(cleaned.slice(start, end).trim())
    if (end >= cleaned.length) break
    start = Math.max(0, end - overlap)
  }
  return chunks.filter(Boolean)
}
