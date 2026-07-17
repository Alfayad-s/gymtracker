'use client'

import { useEffect } from 'react'
import { listenForRestSoundMessages } from '@/lib/notifications'

/**
 * Registers the GymTrack service worker in production for offline shell
 * and background rest-timer notifications. Skipped in development so
 * ServiceWorkerCleanup can keep stale workers away from Turbopack.
 */
export function PwaRegister() {
  useEffect(() => {
    const unlisten = listenForRestSoundMessages()

    if (process.env.NODE_ENV !== 'production') {
      return unlisten
    }
    if (!('serviceWorker' in navigator)) {
      return unlisten
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        /* ignore registration failures */
      })

    return unlisten
  }, [])

  return null
}
