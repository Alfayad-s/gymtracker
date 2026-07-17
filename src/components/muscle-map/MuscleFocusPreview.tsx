'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import maleFront from './data/male-front.json'
import maleBack from './data/male-back.json'
import anatomyCrops from './data/anatomy-crops.json'
import { type BodyPathSet, MUSCLE_LABELS } from './types'

const DATASETS: Record<'front' | 'back', BodyPathSet> = {
  front: maleFront as BodyPathSet,
  back: maleBack as BodyPathSet,
}

type CropBox = { x: number; y: number; width: number; height: number }

const MUSCLE_BOUNDS = anatomyCrops.muscles as Record<
  'front' | 'back',
  Record<string, CropBox | null>
>

const MUSCLE_SIDES = (anatomyCrops as { sides?: Record<string, Record<string, { left?: CropBox; right?: CropBox }>> })
  .sides

/** Limbs shown on one side only in list/detail focus previews. */
const ONE_SIDE_MUSCLES = new Set(['biceps', 'triceps', 'forearm', 'hands'])

type MuscleFocusPreviewProps = {
  view?: 'front' | 'back'
  primary: readonly string[]
  secondary?: readonly string[]
  primaryColor?: string
  secondaryColor?: string
  className?: string
  /** list = tighter body-section zoom; detail = slightly wider context */
  size?: 'list' | 'detail'
  /** Which limb to show for bilateral arm muscles */
  side?: 'left' | 'right'
}

function unionBoxes(boxes: CropBox[], pad: number): CropBox {
  const x = Math.min(...boxes.map((b) => b.x)) - pad
  const y = Math.min(...boxes.map((b) => b.y)) - pad
  const x2 = Math.max(...boxes.map((b) => b.x + b.width)) + pad
  const y2 = Math.max(...boxes.map((b) => b.y + b.height)) + pad
  const w = x2 - x
  const h = y2 - y

  // Prefer a square frame so thumbs look consistent
  const side = Math.max(w, h)
  const cx = x + w / 2
  const cy = y + h / 2
  return {
    x: cx - side / 2,
    y: cy - side / 2,
    width: side,
    height: side,
  }
}

function boundsForSlug(
  view: 'front' | 'back',
  slug: string,
  limbSide: 'left' | 'right'
): CropBox | null {
  if (ONE_SIDE_MUSCLES.has(slug)) {
    const sideBox = MUSCLE_SIDES?.[view]?.[slug]?.[limbSide]
    if (sideBox && sideBox.width > 1 && sideBox.height > 1) return sideBox
  }
  const box = MUSCLE_BOUNDS[view]?.[slug]
  if (box && box.width > 1 && box.height > 1) return box
  return null
}

/**
 * Zooms the anatomy onto the exercise's target body section.
 * Arm/forearm targets use a single limb so the crop does not center on the torso.
 */
export function MuscleFocusPreview({
  view = 'front',
  primary,
  secondary = [],
  primaryColor = 'var(--primary)',
  secondaryColor = 'var(--primary)',
  className,
  size = 'list',
  side = 'left',
}: MuscleFocusPreviewProps) {
  const dataset = DATASETS[view]
  const primarySet = useMemo(() => new Set(primary), [primary])
  const secondarySet = useMemo(() => new Set(secondary), [secondary])
  const focusIsLimb = useMemo(
    () => [...primary, ...secondary].some((slug) => ONE_SIDE_MUSCLES.has(slug)),
    [primary, secondary]
  )

  const { viewBox, strokeWidth } = useMemo(() => {
    const relevantSlugs = [...primary, ...secondary]

    let boxes = primary
      .map((slug) => boundsForSlug(view, slug, side))
      .filter((b): b is CropBox => !!b)

    // Fallback: any relevant muscle bounds
    if (boxes.length === 0) {
      boxes = relevantSlugs
        .map((slug) => boundsForSlug(view, slug, side))
        .filter((b): b is CropBox => !!b)
    }

    // If still bilateral and huge (e.g. both delts), prefer the largest single box
    if (boxes.length > 1) {
      const rough = unionBoxes(boxes, 0)
      if (rough.width > 300) {
        boxes = [[...boxes].sort((a, b) => b.height * b.width - a.height * a.width)[0]]
      }
    }

    const pad = size === 'list' ? (focusIsLimb ? 36 : 22) : focusIsLimb ? 48 : 36
    const vb =
      boxes.length > 0
        ? unionBoxes(boxes, pad)
        : {
            x: dataset.viewBox.x + dataset.viewBox.width * 0.25,
            y: dataset.viewBox.y + dataset.viewBox.height * 0.2,
            width: dataset.viewBox.width * 0.5,
            height: dataset.viewBox.width * 0.5,
          }

    // Keep list cards tightly zoomed on the section
    const maxSide = size === 'list' ? (focusIsLimb ? 280 : 260) : 360
    if (vb.width > maxSide) {
      const cx = vb.x + vb.width / 2
      const cy = vb.y + vb.height / 2
      vb.x = cx - maxSide / 2
      vb.y = cy - maxSide / 2
      vb.width = maxSide
      vb.height = maxSide
    }

    return {
      viewBox: vb,
      strokeWidth: Math.max(1.1, vb.width / 95),
    }
  }, [dataset, primary, secondary, view, size, side, focusIsLimb])

  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      className={cn('muscle-map w-full h-full select-none', className)}
      role="img"
      aria-label={`Anatomy: ${primary.map((p) => MUSCLE_LABELS[p] ?? p).join(', ')}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {dataset.parts.map((part) => {
        const isPrimary = primarySet.has(part.slug)
        const isSecondary = secondarySet.has(part.slug)
        const fill = isPrimary
          ? primaryColor
          : isSecondary
            ? secondaryColor
            : 'var(--muscle-default)'
        const opacity = isPrimary ? 1 : isSecondary ? 0.5 : 0.7

        // One-side highlight for arms/forearms; keep both sides for the body outline
        const highlightOneSide = (isPrimary || isSecondary) && ONE_SIDE_MUSCLES.has(part.slug)
        const paths = highlightOneSide
          ? [...part.common, ...(side === 'left' ? part.left : part.right)]
          : [...part.common, ...part.left, ...part.right]

        // Still draw the opposite limb in default fill so the body doesn't look clipped oddly
        // when zoomed out — but when highlighting one side, opposite uses default.
        if (highlightOneSide) {
          const other = side === 'left' ? part.right : part.left
          return (
            <g key={part.slug} data-muscle={part.slug}>
              {other.map((d, i) => (
                <path
                  key={`${part.slug}-other-${i}`}
                  d={d}
                  fill="var(--muscle-default)"
                  stroke="var(--muscle-stroke)"
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  opacity={0.7}
                />
              ))}
              <g opacity={opacity}>
                {paths.map((d, i) => (
                  <path
                    key={`${part.slug}-${i}`}
                    d={d}
                    fill={fill}
                    stroke="var(--muscle-stroke)"
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            </g>
          )
        }

        return (
          <g key={part.slug} data-muscle={part.slug} opacity={opacity}>
            {paths.map((d, i) => (
              <path
                key={`${part.slug}-${i}`}
                d={d}
                fill={fill}
                stroke="var(--muscle-stroke)"
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
