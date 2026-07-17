import {
  SYNC_STORE_KEYS,
  type SyncMeta,
  type SyncStoreKey,
  type SyncStoreSlice,
  type UserSyncPayload,
  SYNC_VERSION,
  SYNC_META_KEY,
  emptyLocalPayload,
} from '@/lib/sync/types'
import { usePlanStore } from '@/stores/planStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useProgressStore } from '@/stores/progressStore'
import { useRecoveryStore } from '@/stores/recoveryStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useMuscleGroupStore } from '@/stores/muscleGroupStore'
import { useProfileStore } from '@/stores/profileStore'

const EPOCH = new Date(0).toISOString()

function nowIso() {
  return new Date().toISOString()
}

export function getOrCreateClientId(): string {
  const meta = readSyncMeta()
  if (meta.clientId) return meta.clientId
  const clientId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Date.now()}`
  writeSyncMeta({ ...meta, clientId })
  return clientId
}

export function readSyncMeta(): SyncMeta {
  if (typeof window === 'undefined') {
    return { userId: null, clientId: '', storeTimestamps: {}, lastSyncedAt: null }
  }
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) {
      return {
        userId: null,
        clientId: '',
        storeTimestamps: {},
        lastSyncedAt: null,
      }
    }
    return JSON.parse(raw) as SyncMeta
  } catch {
    return { userId: null, clientId: '', storeTimestamps: {}, lastSyncedAt: null }
  }
}

export function writeSyncMeta(meta: SyncMeta) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
}

export function touchStoreTimestamp(key: SyncStoreKey) {
  const meta = readSyncMeta()
  meta.storeTimestamps[key] = nowIso()
  writeSyncMeta(meta)
}

function slice<T>(key: SyncStoreKey, data: T): SyncStoreSlice<T> {
  const meta = readSyncMeta()
  return {
    data,
    updatedAt: meta.storeTimestamps[key] ?? EPOCH,
  }
}

export function collectLocalPayload(): UserSyncPayload {
  const plans = usePlanStore.getState().plans
  const workouts = useHistoryStore.getState().workouts
  const activeSession = useWorkoutStore.getState().activeSession
  const { bodyWeightLog, goalWeight } = useProgressStore.getState()
  const { lastTrained } = useRecoveryStore.getState()
  const exercises = useExerciseStore.getState().exercises
  const groups = useMuscleGroupStore.getState().groups
  const { heightCm, weightUnit, experienceLevel } = useProfileStore.getState()

  return {
    version: SYNC_VERSION,
    stores: {
      plans: slice('plans', plans),
      history: slice('history', workouts),
      activeWorkout: slice('activeWorkout', activeSession),
      progress: slice('progress', { bodyWeightLog, goalWeight }),
      recovery: slice('recovery', { lastTrained }),
      customExercises: slice('customExercises', exercises),
      muscleGroups: slice('muscleGroups', groups),
      profile: slice('profile', { heightCm, weightUnit, experienceLevel }),
    },
  }
}

export { emptyLocalPayload }

export function applyPayloadToStores(payload: UserSyncPayload) {
  usePlanStore.setState({ plans: payload.stores.plans.data })
  useHistoryStore.setState({ workouts: payload.stores.history.data })
  useWorkoutStore.setState({ activeSession: payload.stores.activeWorkout.data })
  useProgressStore.setState({
    bodyWeightLog: payload.stores.progress.data.bodyWeightLog,
    goalWeight: payload.stores.progress.data.goalWeight,
  })
  // History is the source of truth for recovery fatigue
  useRecoveryStore.getState().rebuildFromWorkouts(payload.stores.history.data)
  useExerciseStore.setState({
    exercises: payload.stores.customExercises.data,
  })
  useMuscleGroupStore.setState({
    groups: payload.stores.muscleGroups.data,
  })
  useProfileStore.setState({
    heightCm: payload.stores.profile.data.heightCm,
    weightUnit: payload.stores.profile.data.weightUnit,
    experienceLevel: payload.stores.profile.data.experienceLevel,
  })

  const meta = readSyncMeta()
  for (const key of SYNC_STORE_KEYS) {
    meta.storeTimestamps[key] = payload.stores[key].updatedAt
  }
  // Recovery was rebuilt from history — keep its stamp aligned
  meta.storeTimestamps.recovery = payload.stores.history.updatedAt
  meta.lastSyncedAt = nowIso()
  writeSyncMeta(meta)
}

export function markAllStoresTouched() {
  const ts = nowIso()
  const meta = readSyncMeta()
  for (const key of SYNC_STORE_KEYS) {
    meta.storeTimestamps[key] = ts
  }
  writeSyncMeta(meta)
}

export function setSyncUserId(userId: string | null) {
  const meta = readSyncMeta()
  meta.userId = userId
  writeSyncMeta(meta)
}

export function clearSyncMeta() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SYNC_META_KEY)
}
