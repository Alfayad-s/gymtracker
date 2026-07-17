'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

type Transform = {
  scale: number
  x: number
  y: number
}

type PinchState = {
  startDistance: number
  startScale: number
  startX: number
  startY: number
  startMidX: number
  startMidY: number
}

type PanState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

const DEFAULT_MIN = 1
const DEFAULT_MAX = 4
const WHEEL_FACTOR = 0.0018

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

type ZoomableAnatomyProps = {
  children: ReactNode
  className?: string
  showControls?: boolean
  showHint?: boolean
  minScale?: number
  maxScale?: number
}

/**
 * Pinch-to-zoom + pan wrapper for the body anatomy map.
 * Two fingers zoom; one finger pans when zoomed in; mouse wheel zooms on desktop.
 */
export function ZoomableAnatomy({
  children,
  className,
  showControls = true,
  showHint = true,
  minScale = DEFAULT_MIN,
  maxScale = DEFAULT_MAX,
}: ZoomableAnatomyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<PinchState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const interactingRef = useRef(false)

  const reset = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 })
    pinchRef.current = null
    panRef.current = null
  }, [])

  const zoomBy = useCallback(
    (delta: number, clientX?: number, clientY?: number) => {
      const el = containerRef.current
      const t = transformRef.current
      const nextScale = clamp(t.scale * (1 + delta), minScale, maxScale)
      if (Math.abs(nextScale - t.scale) < 0.001) return

      if (nextScale <= minScale + 0.001) {
        setTransform({ scale: 1, x: 0, y: 0 })
        return
      }

      if (el && clientX != null && clientY != null) {
        const rect = el.getBoundingClientRect()
        const cx = clientX - rect.left - rect.width / 2
        const cy = clientY - rect.top - rect.height / 2
        const ratio = nextScale / t.scale
        setTransform({
          scale: nextScale,
          x: cx - (cx - t.x) * ratio,
          y: cy - (cy - t.y) * ratio,
        })
        return
      }

      setTransform({ scale: nextScale, x: t.x, y: t.y })
    },
    [minScale, maxScale]
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const points = [...pointersRef.current.values()]
    if (points.length === 2) {
      interactingRef.current = true
      panRef.current = null
      for (const id of pointersRef.current.keys()) {
        try {
          el.setPointerCapture(id)
        } catch {
          /* ignore */
        }
      }
      const [a, b] = points
      const t = transformRef.current
      pinchRef.current = {
        startDistance: Math.max(8, distance(a, b)),
        startScale: t.scale,
        startX: t.x,
        startY: t.y,
        startMidX: (a.x + b.x) / 2,
        startMidY: (a.y + b.y) / 2,
      }
    } else if (points.length === 1 && transformRef.current.scale > 1.02) {
      interactingRef.current = true
      pinchRef.current = null
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y,
      }
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const points = [...pointersRef.current.values()]
    const el = containerRef.current
    if (!el) return

    if (points.length >= 2 && pinchRef.current) {
      e.preventDefault()
      const [a, b] = points
      const pinch = pinchRef.current
      const dist = Math.max(8, distance(a, b))
      const nextScale = clamp(
        pinch.startScale * (dist / pinch.startDistance),
        minScale,
        maxScale
      )

      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      const rect = el.getBoundingClientRect()
      const midLocalX = midX - rect.left - rect.width / 2
      const midLocalY = midY - rect.top - rect.height / 2
      const startMidLocalX = pinch.startMidX - rect.left - rect.width / 2
      const startMidLocalY = pinch.startMidY - rect.top - rect.height / 2
      const ratio = nextScale / pinch.startScale

      if (nextScale <= minScale + 0.001) {
        setTransform({ scale: 1, x: 0, y: 0 })
        return
      }

      setTransform({
        scale: nextScale,
        x: midLocalX - (startMidLocalX - pinch.startX) * ratio,
        y: midLocalY - (startMidLocalY - pinch.startY) * ratio,
      })
      return
    }

    if (panRef.current && panRef.current.pointerId === e.pointerId && points.length === 1) {
      e.preventDefault()
      const pan = panRef.current
      setTransform({
        scale: transformRef.current.scale,
        x: pan.originX + (e.clientX - pan.startX),
        y: pan.originY + (e.clientY - pan.startY),
      })
    }
  }

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null

    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) interactingRef.current = false

    if (transformRef.current.scale <= 1.02) {
      setTransform({ scale: 1, x: 0, y: 0 })
    }

    const el = containerRef.current
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
  }

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 0.5) return
    e.preventDefault()
    const factor = -e.deltaY * WHEEL_FACTOR
    zoomBy(factor, e.clientX, e.clientY)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (ev: TouchEvent) => {
      if (ev.touches.length > 1) ev.preventDefault()
    }
    el.addEventListener('touchmove', prevent, { passive: false })
    return () => el.removeEventListener('touchmove', prevent)
  }, [])

  const isZoomed = transform.scale > 1.02

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full overflow-hidden rounded-[20px] select-none',
          isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        )}
        style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
      >
        <div
          className="flex justify-center will-change-transform origin-center"
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transition: interactingRef.current ? 'none' : 'transform 140ms ease-out',
          }}
        >
          {children}
        </div>
      </div>

      {showControls && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={() => zoomBy(-0.25)}
            disabled={transform.scale <= minScale}
            className="h-9 w-9 rounded-full bg-card/95 border border-border text-foreground shadow-sm flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.25)}
            disabled={transform.scale >= maxScale}
            className="h-9 w-9 rounded-full bg-card/95 border border-border text-foreground shadow-sm flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          {isZoomed && (
            <button
              type="button"
              onClick={reset}
              className="h-9 w-9 rounded-full bg-card/95 border border-border text-foreground shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {showHint && (
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Pinch with two fingers to zoom · drag to pan
        </p>
      )}
    </div>
  )
}
