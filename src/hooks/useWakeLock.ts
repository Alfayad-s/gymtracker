'use client'

import { useEffect, useRef } from 'react'

/**
 * Keeps the screen on while `enabled` is true (e.g. during an active workout).
 * Re-acquires after visibility returns — browsers release wake lock when hidden.
 */
export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled) {
      void sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
      return
    }

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let cancelled = false

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null
        })
      } catch {
        /* unsupported or denied */
      }
    }

    void request()

    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [enabled])
}
