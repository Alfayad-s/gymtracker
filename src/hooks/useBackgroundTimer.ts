'use client'

import { useEffect, useRef } from 'react'
import { useTimerStore } from '@/stores/timerStore'
import {
  cancelScheduledRestNotification,
  scheduleRestNotification,
  showRestCompleteNotification,
} from '@/lib/notifications'

/**
 * Keeps the rest timer accurate when the tab is backgrounded or the phone locks
 * by syncing from the endsAt deadline, and fires a notification when rest ends.
 */
export function useBackgroundTimer() {
  const isActive = useTimerStore((s) => s.isActive)
  const endsAt = useTimerStore((s) => s.endsAt)
  const justFinished = useTimerStore((s) => s.justFinished)
  const syncTimer = useTimerStore((s) => s.syncTimer)
  const notifiedRef = useRef(false)

  // Fast sync while active for smooth countdown UI
  useEffect(() => {
    if (!isActive) return
    syncTimer()
    const id = setInterval(() => syncTimer(), 250)
    return () => clearInterval(id)
  }, [isActive, syncTimer])

  // Sync when returning from background
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncTimer()
    }
    const onFocus = () => syncTimer()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    // Sync once on mount (covers persisted mid-rest state)
    syncTimer()
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [syncTimer])

  // Schedule SW notification when a rest deadline is set
  useEffect(() => {
    if (isActive && endsAt != null) {
      scheduleRestNotification(endsAt)
      notifiedRef.current = false
    } else if (!isActive && !justFinished) {
      cancelScheduledRestNotification()
    }
  }, [isActive, endsAt, justFinished])

  // Notify + sound + vibrate when rest finishes (page may still be open)
  useEffect(() => {
    if (!justFinished) {
      notifiedRef.current = false
      return
    }
    if (notifiedRef.current) return
    notifiedRef.current = true
    cancelScheduledRestNotification()
    showRestCompleteNotification()
    try {
      navigator.vibrate?.([200, 100, 200, 100, 200])
    } catch {
      /* ignore */
    }
  }, [justFinished])
}
