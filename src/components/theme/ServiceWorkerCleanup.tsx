'use client'

import { useEffect } from 'react'

/** Unregister stale PWA service workers in development only (avoids stale Server Action IDs). */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })

    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.includes('workbox') || key.includes('next-pwa')) {
            caches.delete(key)
          }
        }
      })
    }
  }, [])

  return null
}
