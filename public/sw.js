/* GymTrack service worker — rest timer notifications + basic offline shell */

const CACHE = 'gymtrack-shell-v2'
const REST_SOUND = '/media/notificaiton-sound.wav'
const PRECACHE = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/dashboard',
  REST_SOUND,
]

let restTimeoutId = null

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigation: network first, fall back to cached dashboard
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/dashboard'))
        )
    )
    return
  }

  // Static assets: cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname.startsWith('/media/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {})
            return res
          })
      )
    )
  }
})

function showRestNotification(soundUrl) {
  return self.registration.showNotification('Rest complete', {
    body: 'Next set ready — tap to continue your workout',
    tag: 'gymtrack-rest',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    silent: false,
    sound: soundUrl || REST_SOUND,
    data: { url: '/workout', sound: soundUrl || REST_SOUND },
  })
}

function notifyClientsToPlaySound() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: 'PLAY_REST_SOUND' })
    }
  })
}

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'CANCEL_REST') {
    if (restTimeoutId != null) {
      clearTimeout(restTimeoutId)
      restTimeoutId = null
    }
    return
  }

  if (data.type === 'SCHEDULE_REST' && typeof data.endsAt === 'number') {
    if (restTimeoutId != null) {
      clearTimeout(restTimeoutId)
      restTimeoutId = null
    }

    const soundUrl = typeof data.sound === 'string' ? data.sound : REST_SOUND
    const delay = Math.max(0, data.endsAt - Date.now())
    restTimeoutId = setTimeout(() => {
      restTimeoutId = null
      Promise.all([
        showRestNotification(soundUrl).catch(() => {}),
        notifyClientsToPlaySound().catch(() => {}),
      ]).catch(() => {})
    }, delay)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/workout'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
