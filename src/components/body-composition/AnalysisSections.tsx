'use client'

import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Apple,
  Dumbbell,
  HeartPulse,
  ListOrdered,
  Moon,
  Scale,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  parseAnalysisSections,
  type AnalysisSection,
} from '@/lib/body-composition/parse-analysis'
import { cn } from '@/lib/utils'

const SECTION_ICON: Array<{ match: RegExp; icon: typeof Sparkles; accent: string }> = [
  { match: /overall|health\s*score|overview/i, icon: HeartPulse, accent: 'text-primary' },
  { match: /\bbmi\b/i, icon: Activity, accent: 'text-primary' },
  { match: /muscle|lean|balance/i, icon: Dumbbell, accent: 'text-sky-500' },
  { match: /fat|distribution/i, icon: Scale, accent: 'text-warning' },
  { match: /body\s*composition|summary/i, icon: Scale, accent: 'text-foreground' },
  { match: /train/i, icon: Target, accent: 'text-primary' },
  { match: /recover|sleep|rest/i, icon: Moon, accent: 'text-sky-500' },
  { match: /nutrition|diet|food|calorie/i, icon: Apple, accent: 'text-warning' },
  { match: /risk/i, icon: AlertTriangle, accent: 'text-destructive' },
  { match: /priority|improve|next/i, icon: ListOrdered, accent: 'text-primary' },
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

function SectionCard({ section }: { section: AnalysisSection }) {
  const meta = sectionMeta(section.title || 'Insight')
  const Icon = meta.icon
  const title = section.title || 'Insight'

  return (
    <article className="rounded-[18px] border border-border/50 bg-background/40 px-3.5 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-xl bg-muted/80',
            meta.accent
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h4 className="text-[12px] font-bold tracking-tight text-foreground">{title}</h4>
      </div>

      {section.paragraphs.map((p, i) => (
        <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">
          <InlineMarkdown text={p} />
        </p>
      ))}

      {section.bullets.length > 0 && (
        <ul className="space-y-1.5 pt-0.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current', meta.accent)} />
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

export function AnalysisSections({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const sections = parseAnalysisSections(text)
  if (!sections.length) return null

  return (
    <div className={cn('space-y-2.5', className)}>
      {sections.map((section, i) => (
        <SectionCard key={`${section.title}-${i}`} section={section} />
      ))}
    </div>
  )
}
