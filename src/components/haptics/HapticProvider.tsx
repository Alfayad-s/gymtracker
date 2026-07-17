'use client'

import { useEffect } from 'react'
import { findHapticTarget, hapticStyleForTarget, triggerHaptic } from '@/lib/haptics'

/**
 * App-wide haptic feedback for taps on buttons, links, and other clickable UI.
 * Uses pointerdown so feedback feels immediate on mobile.
 */
export function HapticProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let lastAt = 0
    let lastTarget: Element | null = null

    const onPointerDown = (event: PointerEvent) => {
      // Only primary pointer (ignore multi-touch extras / right-click)
      if (event.button !== 0 && event.pointerType === 'mouse') return

      const target = findHapticTarget(event.target)
      if (!target) return

      const now = Date.now()
      // Debounce duplicate events on the same control (label+input, nested icons)
      if (target === lastTarget && now - lastAt < 80) return
      lastAt = now
      lastTarget = target

      triggerHaptic(hapticStyleForTarget(target))
    }

    // Capture phase so we still fire even if a handler stops propagation
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [])

  return <>{children}</>
}
