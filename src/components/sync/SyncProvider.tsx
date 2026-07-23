'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usePlanStore } from '@/stores/planStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useProgressStore } from '@/stores/progressStore'
import { useRecoveryStore } from '@/stores/recoveryStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useMuscleGroupStore } from '@/stores/muscleGroupStore'
import { useProfileStore } from '@/stores/profileStore'
import {
  applyPayloadToStores,
  collectLocalPayload,
  emptyLocalPayload,
  getOrCreateClientId,
  readSyncMeta,
  setSyncUserId,
  touchStoreTimestamp,
} from '@/lib/sync/client'
import { mergePayloads } from '@/lib/sync/types'

const PUSH_DEBOUNCE_MS = 2500

/** Syncs gym data to the logged-in user's cloud snapshot for cross-device consistency. */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const syncingRef = useRef(false)
  const applyingRef = useRef(false)
  const pendingPushRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    getOrCreateClientId()
  }, [])

  // Wait for zustand persist rehydration before first sync
  useEffect(() => {
    const stores = [
      usePlanStore,
      useHistoryStore,
      useWorkoutStore,
      useProgressStore,
      useRecoveryStore,
      useExerciseStore,
      useMuscleGroupStore,
      useProfileStore,
    ]

    let pending = stores.length
    const done = () => {
      pending -= 1
      if (pending <= 0) hydratedRef.current = true
    }

    for (const store of stores) {
      const persistApi = (
        store as unknown as {
          persist?: {
            hasHydrated?: () => boolean
            onFinishHydration?: (fn: () => void) => () => void
          }
        }
      ).persist

      if (persistApi?.hasHydrated?.()) {
        done()
        continue
      }

      const unsub = persistApi?.onFinishHydration?.(() => done())
      if (!unsub) done()
    }

    const fallback = setTimeout(() => {
      hydratedRef.current = true
    }, 1500)

    return () => clearTimeout(fallback)
  }, [])

  useEffect(() => {
    if (loading || !user) return

    let cancelled = false

    const flushPendingPush = () => {
      if (!pendingPushRef.current || cancelled) return
      pendingPushRef.current = false
      schedulePush()
    }

    const pushNow = async () => {
      if (!user || applyingRef.current) return
      syncingRef.current = true
      try {
        const payload = collectLocalPayload()
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const { payload: saved } = (await res.json()) as {
            payload: ReturnType<typeof collectLocalPayload>
          }
          // Keep any edits that landed during the POST round-trip.
          const newestLocal = collectLocalPayload()
          const finalPayload = mergePayloads(saved, newestLocal)
          if (!cancelled) {
            applyingRef.current = true
            applyPayloadToStores(finalPayload)
            applyingRef.current = false
          }
        }
      } catch {
        /* ignore background push errors */
      } finally {
        syncingRef.current = false
        flushPendingPush()
      }
    }

    const schedulePush = () => {
      if (applyingRef.current) return
      if (syncingRef.current) {
        // Don't drop local mutations while a sync is in flight — flush after it ends.
        pendingPushRef.current = true
        return
      }
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(() => {
        if (syncingRef.current) {
          pendingPushRef.current = true
          return
        }
        void pushNow()
      }, PUSH_DEBOUNCE_MS)
    }

    const runSync = async () => {
      if (syncingRef.current) return
      syncingRef.current = true

      try {
        const meta = readSyncMeta()
        const userChanged = Boolean(meta.userId && meta.userId !== user.id)
        setSyncUserId(user.id)

        const res = await fetch('/api/sync', { method: 'GET' })
        if (!res.ok) return

        const { payload: remote } = (await res.json()) as {
          payload: ReturnType<typeof collectLocalPayload> | null
        }

        // Collect local AFTER the network wait so mid-flight edits (start workout, etc.)
        // are not wiped by a stale pre-request snapshot.
        const local = userChanged ? emptyLocalPayload() : collectLocalPayload()
        const merged = mergePayloads(remote, local)

        if (!cancelled) {
          applyingRef.current = true
          applyPayloadToStores(merged)
          applyingRef.current = false
        }

        const pushRes = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        })

        if (pushRes.ok) {
          const { payload: saved } = (await pushRes.json()) as {
            payload: ReturnType<typeof collectLocalPayload>
          }
          if (!cancelled) {
            const newestLocal = collectLocalPayload()
            const finalPayload = mergePayloads(saved, newestLocal)
            applyingRef.current = true
            applyPayloadToStores(finalPayload)
            applyingRef.current = false
          }
        }
      } catch (err) {
        console.error('Data sync failed:', err)
      } finally {
        syncingRef.current = false
        flushPendingPush()
      }
    }

    const waitHydration = setInterval(() => {
      if (!hydratedRef.current) return
      clearInterval(waitHydration)
      void runSync()
    }, 100)

    const unsubscribers = [
      usePlanStore.subscribe(() => {
        touchStoreTimestamp('plans')
        schedulePush()
      }),
      useHistoryStore.subscribe(() => {
        touchStoreTimestamp('history')
        schedulePush()
      }),
      useWorkoutStore.subscribe(() => {
        touchStoreTimestamp('activeWorkout')
        schedulePush()
      }),
      useProgressStore.subscribe(() => {
        touchStoreTimestamp('progress')
        schedulePush()
      }),
      useRecoveryStore.subscribe(() => {
        touchStoreTimestamp('recovery')
        schedulePush()
      }),
      useExerciseStore.subscribe(() => {
        touchStoreTimestamp('customExercises')
        schedulePush()
      }),
      useMuscleGroupStore.subscribe(() => {
        touchStoreTimestamp('muscleGroups')
        schedulePush()
      }),
      useProfileStore.subscribe((state, prev) => {
        if (
          state.heightCm === prev.heightCm &&
          state.weightUnit === prev.weightUnit &&
          state.experienceLevel === prev.experienceLevel
        ) {
          return
        }
        touchStoreTimestamp('profile')
        schedulePush()
      }),
    ]

    return () => {
      cancelled = true
      clearInterval(waitHydration)
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      for (const unsub of unsubscribers) unsub()
    }
    // Intentionally keyed on user.id so profile object identity changes don't re-bind sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id
  }, [user?.id, loading])

  return <>{children}</>
}

export async function pushSyncBeforeLogout() {
  try {
    const payload = collectLocalPayload()
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    /* best effort */
  }
}
