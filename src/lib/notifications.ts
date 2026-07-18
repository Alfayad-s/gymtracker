'use client'

const REST_TAG = 'gymtrack-rest'
/** Filename matches the asset in public/media (spelling as on disk). */
export const REST_SOUND_URL = '/media/notificaiton-sound.wav'

let restAudio: HTMLAudioElement | null = null

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function getRestAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!restAudio) {
    restAudio = new Audio(REST_SOUND_URL)
    restAudio.preload = 'auto'
  }
  return restAudio
}

/**
 * Unlock audio during a user gesture (e.g. Complete Set) so the sound
 * can play later when rest finishes — including after brief backgrounding.
 */
export async function unlockRestSound(): Promise<void> {
  const audio = getRestAudio()
  if (!audio) return
  try {
    audio.volume = 0.01
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    audio.volume = 1
  } catch {
    /* autoplay still blocked — will retry on finish */
  }
}

/** Play the rest-complete sound (best-effort when the page can use Audio). */
export function playRestCompleteSound(): void {
  const audio = getRestAudio()
  if (!audio) return
  try {
    audio.pause()
    audio.currentTime = 0
    audio.volume = 1
    void audio.play().catch(() => {
      /* ignore autoplay / focus restrictions */
    })
  } catch {
    /* ignore */
  }
}

const restNotificationOptions = (): NotificationOptions =>
  ({
    body: 'Next set ready — tap to continue your workout',
    tag: REST_TAG,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    silent: false,
    // Non-standard; used by some WebKit / older UAs. Chrome ignores it.
    sound: REST_SOUND_URL,
    data: { url: '/workout', sound: REST_SOUND_URL },
  }) as NotificationOptions

export function showRestCompleteNotification(): void {
  if (!notificationSupported()) return
  if (Notification.permission !== 'granted') return

  playRestCompleteSound()

  // Prefer service worker notification when available (works better when backgrounded)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        void reg.showNotification('Rest complete', restNotificationOptions())
      })
      .catch(() => {
        fallbackPageNotification()
      })
    return
  }

  fallbackPageNotification()
}

function fallbackPageNotification(): void {
  try {
    const n = new Notification('Rest complete', restNotificationOptions())
    n.onclick = () => {
      window.focus()
      window.location.href = '/workout'
      n.close()
    }
  } catch {
    /* ignore */
  }
}

/** Ask the service worker to fire a notification at endsAt (best-effort when backgrounded). */
export function scheduleRestNotification(endsAt: number): void {
  if (!notificationSupported()) return
  if (Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({
        type: 'SCHEDULE_REST',
        endsAt,
        sound: REST_SOUND_URL,
      })
    })
    .catch(() => {
      /* ignore */
    })
}

export function cancelScheduledRestNotification(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({ type: 'CANCEL_REST' })
    })
    .catch(() => {
      /* ignore */
    })
}

/** Listen for SW messages so we can play the custom sound when a client is awake. */
export function listenForRestSoundMessages(): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {}
  }

  const onMessage = (event: MessageEvent) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === 'PLAY_REST_SOUND') {
      playRestCompleteSound()
    }
  }

  navigator.serviceWorker.addEventListener('message', onMessage)
  return () => navigator.serviceWorker.removeEventListener('message', onMessage)
}

/** Generic page notification for body composition events. */
export function notifyBodyComposition(title: string, body: string): void {
  if (!notificationSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag: 'gymtrack-body-composition',
      icon: '/icon-192x192.png',
    })
    n.onclick = () => {
      window.focus()
      window.location.href = '/body-composition'
      n.close()
    }
  } catch {
    /* ignore */
  }
}

/** Challenge / streak / level notifications. */
export function notifyChallenge(title: string, body: string, href = '/challenges'): void {
  if (!notificationSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag: 'gymtrack-challenge',
      icon: '/icon-192x192.png',
    })
    n.onclick = () => {
      window.focus()
      window.location.href = href
      n.close()
    }
  } catch {
    /* ignore */
  }
}
