/**
 * Lightweight markdown → structured sections for body-composition AI output.
 * Handles ## headings, standalone **Title** lines, bullets, and inline **bold**.
 */

export type AnalysisSection = {
  title: string
  paragraphs: string[]
  bullets: string[]
}

const HEADING_RE = /^(#{1,3})\s+(.+)$/
const BOLD_TITLE_RE = /^\*\*(.+?)\*\*\s*:?\s*$/
const BULLET_RE = /^[-*•]\s+(.+)$/
const NUMBERED_RE = /^\d+[.)]\s+(.+)$/

export function parseAnalysisSections(raw: string): AnalysisSection[] {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return []

  const lines = text.split('\n')
  const sections: AnalysisSection[] = []
  let current: AnalysisSection = { title: '', paragraphs: [], bullets: [] }

  const push = () => {
    if (current.title || current.paragraphs.length || current.bullets.length) {
      sections.push(current)
    }
    current = { title: '', paragraphs: [], bullets: [] }
  }

  let paraBuf: string[] = []
  const flushPara = () => {
    const joined = paraBuf.join(' ').trim()
    if (joined) current.paragraphs.push(joined)
    paraBuf = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushPara()
      continue
    }

    const heading = line.match(HEADING_RE)
    const boldTitle = line.match(BOLD_TITLE_RE)
    if (heading || boldTitle) {
      flushPara()
      push()
      current.title = (heading?.[2] ?? boldTitle?.[1] ?? '').trim()
      continue
    }

    const bullet = line.match(BULLET_RE) ?? line.match(NUMBERED_RE)
    if (bullet) {
      flushPara()
      current.bullets.push(bullet[1].trim())
      continue
    }

    paraBuf.push(line)
  }

  flushPara()
  push()

  // Label leading prose (before the first heading) as Overview
  if (sections[0] && !sections[0].title) {
    sections[0].title = 'Overview'
  }

  return sections
}

/** Strip remaining markdown markers for plain display fallbacks. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim()
}

export function extractSectionBody(
  sections: AnalysisSection[],
  titleMatch: RegExp
): string | null {
  const found = sections.find((s) => titleMatch.test(s.title))
  if (!found) return null
  const parts = [
    ...found.paragraphs.map(stripMarkdown),
    ...found.bullets.map((b) => stripMarkdown(b)),
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}
