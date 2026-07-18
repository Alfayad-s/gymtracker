'use client'

import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Apple,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  ListOrdered,
  Moon,
  Scale,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import {
  parseAnalysisSections,
  type AnalysisSection,
} from '@/lib/body-composition/parse-analysis'
import { cn } from '@/lib/utils'

const SECTION_ICON: Array<{ match: RegExp; icon: typeof Sparkles; accent: string }> = [
  { match: /overall|health\s*score|overview|summary|answer/i, icon: HeartPulse, accent: 'text-primary' },
  { match: /\bbmi\b/i, icon: Activity, accent: 'text-primary' },
  { match: /muscle|lean|balance|strength/i, icon: Dumbbell, accent: 'text-sky-500' },
  { match: /fat|distribution|cut|bulk/i, icon: Scale, accent: 'text-warning' },
  { match: /body\s*composition/i, icon: Scale, accent: 'text-foreground' },
  { match: /workout|train|exercise|sets?|reps?/i, icon: Target, accent: 'text-primary' },
  { match: /plan|program|split|schedule/i, icon: ClipboardList, accent: 'text-sky-500' },
  { match: /recover|sleep|rest/i, icon: Moon, accent: 'text-sky-500' },
  { match: /nutrition|diet|food|calorie|protein/i, icon: Apple, accent: 'text-warning' },
  { match: /risk|caution|warn/i, icon: AlertTriangle, accent: 'text-destructive' },
  { match: /priority|improve|next|tip|recommend/i, icon: ListOrdered, accent: 'text-primary' },
  { match: /quick|key\s*takeaway|tl;?dr/i, icon: Zap, accent: 'text-primary' },
]

function sectionMeta(title: string) {
  return (
    SECTION_ICON.find((s) => s.match.test(title)) ?? {
      icon: Sparkles,
      accent: 'text-primary',
    }
  )
}

/** Render inline **bold** / *italic* without leaking markers. */
export function InlineMarkdown({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }
    if (match[2] != null) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {match[2]}
        </strong>
      )
    } else if (match[3] != null) {
      nodes.push(
        <em key={key++} className="italic">
          {match[3]}
        </em>
      )
    } else if (match[4] != null) {
      nodes.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 text-[11px]">
          {match[4]}
        </code>
      )
    }
    last = match.index + match[0].length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return <>{nodes}</>
}

function SectionCard({
  section,
  compact,
}: {
  section: AnalysisSection
  compact?: boolean
}) {
  const meta = sectionMeta(section.title || 'Insight')
  const Icon = meta.icon
  const title = section.title || 'Insight'

  return (
    <article
      className={cn(
        'rounded-[18px] border border-border/50 bg-card/80 px-3.5 py-3 space-y-2',
        compact && 'rounded-[14px] px-3 py-2.5 space-y-1.5'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-xl bg-muted/80',
            compact && 'h-6 w-6 rounded-lg',
            meta.accent
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} />
        </span>
        <h4
          className={cn(
            'text-[12px] font-bold tracking-tight text-foreground',
            compact && 'text-[11px]'
          )}
        >
          {title}
        </h4>
      </div>

      {section.paragraphs.map((p, i) => (
        <p
          key={i}
          className={cn(
            'text-[13px] leading-relaxed text-muted-foreground',
            compact && 'text-xs'
          )}
        >
          <InlineMarkdown text={p} />
        </p>
      ))}

      {section.bullets.length > 0 && (
        <ul className={cn('space-y-1.5 pt-0.5', compact && 'space-y-1')}>
          {section.bullets.map((b, i) => (
            <li
              key={i}
              className={cn(
                'flex gap-2 text-[13px] leading-relaxed text-muted-foreground',
                compact && 'text-xs'
              )}
            >
              <span
                className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current', meta.accent)}
              />
              <span>
                <InlineMarkdown text={b} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function isSimpleProse(sections: AnalysisSection[]) {
  return (
    sections.length === 1 &&
    (!sections[0].title || sections[0].title === 'Overview') &&
    sections[0].bullets.length === 0
  )
}

export function AnalysisSections({
  text,
  className,
  compact,
}: {
  text: string
  className?: string
  compact?: boolean
}) {
  const sections = parseAnalysisSections(text)
  if (!sections.length) return null

  return (
    <div className={cn('space-y-2.5', compact && 'space-y-2', className)}>
      {sections.map((section, i) => (
        <SectionCard key={`${section.title}-${i}`} section={section} compact={compact} />
      ))}
    </div>
  )
}

/**
 * Chat / coach message renderer:
 * - Short prose → single bubble with bold/italic
 * - Headings / bullets → icon section cards
 */
export function FormattedAiMessage({
  text,
  className,
  compact,
  bubbleClassName,
}: {
  text: string
  className?: string
  compact?: boolean
  /** Applied when the message is simple prose (chat bubble look). */
  bubbleClassName?: string
}) {
  const sections = parseAnalysisSections(text)
  if (!sections.length) return null

  if (isSimpleProse(sections)) {
    return (
      <div
        className={cn(
          'px-4 py-3 text-sm leading-relaxed bg-card border border-border text-foreground rounded-[22px] space-y-2',
          compact && 'px-3 py-2 text-xs rounded-[14px] space-y-1.5',
          bubbleClassName,
          className
        )}
      >
        {sections[0].paragraphs.map((p, i) => (
          <p key={i}>
            <InlineMarkdown text={p} />
          </p>
        ))}
      </div>
    )
  }

  return <AnalysisSections text={text} className={className} compact={compact} />
}
