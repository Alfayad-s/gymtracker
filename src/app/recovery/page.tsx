'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Dumbbell } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useRecoveryStore } from '@/stores/recoveryStore'
import { useHistoryStore } from '@/stores/historyStore'
import {
  RECOVERY_GROUPS,
  GROUP_TO_MAP,
  STATUS_COLOR,
  RECOVERY_HOURS,
  getGroupRecovery,
  type RecoveryGroup,
  type RecoveryStatus,
} from '@/lib/muscle-recovery'
import { MuscleMap, ZoomableAnatomy, MUSCLE_LABELS, type MuscleHighlights } from '@/components/muscle-map'

const statusStyles: Record<RecoveryStatus, string> = {
  Ready: 'text-primary',
  Recovering: 'text-warning',
  Fatigued: 'text-destructive',
}

const statusBg: Record<RecoveryStatus, string> = {
  Ready: 'bg-primary/10 border-primary/25',
  Recovering: 'bg-warning/10 border-warning/25',
  Fatigued: 'bg-destructive/10 border-destructive/25',
}

function muscleSlugToGroup(slug: string): RecoveryGroup | null {
  for (const group of RECOVERY_GROUPS) {
    if ((GROUP_TO_MAP[group] as readonly string[]).includes(slug)) return group
  }
  return null
}

export default function RecoveryDetailPage() {
  const router = useRouter()
  const lastTrained = useRecoveryStore((s) => s.lastTrained)
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front')
  const [selectedGroup, setSelectedGroup] = useState<RecoveryGroup | null>(null)
  const [selectedMuscleSlug, setSelectedMuscleSlug] = useState<string | null>(null)
  const [selectedMuscleLabel, setSelectedMuscleLabel] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    setHydrated(true)
    const id = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const recoveryList = useMemo(() => {
    void nowTick
    return RECOVERY_GROUPS.map((group) =>
      getGroupRecovery(group, lastTrained[group]?.date ?? null, Date.now())
    )
  }, [lastTrained, nowTick])

  const recoveryHighlights = useMemo(() => {
    const map: MuscleHighlights = {}
    for (const item of recoveryList) {
      const opacity = 0.35 + (1 - item.recoveredPct) * 0.6
      for (const muscle of GROUP_TO_MAP[item.group]) {
        map[muscle] = { color: STATUS_COLOR[item.status], opacity }
      }
    }
    return map
  }, [recoveryList])

  const selectedMapIds = useMemo(() => {
    if (selectedMuscleSlug) return [selectedMuscleSlug]
    if (selectedGroup) return [...GROUP_TO_MAP[selectedGroup]]
    return null
  }, [selectedMuscleSlug, selectedGroup])

  const selectedDetail = selectedGroup
    ? recoveryList.find((item) => item.group === selectedGroup) ?? null
    : null

  const volumeForGroup = (group: RecoveryGroup) => lastTrained[group]?.volumeKg ?? 0

  // Keep recovery in sync if history was cleared before this fix
  useEffect(() => {
    if (!hydrated) return
    useRecoveryStore.getState().rebuildFromWorkouts(useHistoryStore.getState().workouts)
  }, [hydrated])

  return (
    <div className="px-5 pt-5 pb-10 space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Muscle Recovery</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full body overview and recovery status
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[24px] p-5 space-y-5">
        <div className="flex items-center justify-center gap-2">
          {(['front', 'back'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setBodyView(view)}
              className={`h-9 px-5 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                bodyView === view
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <div className="flex justify-center py-2">
          <ZoomableAnatomy className="w-full max-w-[360px]">
            <MuscleMap
              view={bodyView}
              highlights={recoveryHighlights}
              selected={selectedMapIds}
              defaultFill="var(--muscle-default)"
              className="w-full max-w-[320px] max-h-[min(62vh,520px)]"
              onMuscleClick={(muscle) => {
                setSelectedMuscleSlug(muscle)
                setSelectedMuscleLabel(MUSCLE_LABELS[muscle] ?? muscle)
                setSelectedGroup(muscleSlugToGroup(muscle))
              }}
            />
          </ZoomableAnatomy>
        </div>

        <div className="flex items-center justify-center gap-4 text-[10px] font-medium">
          <span className="flex items-center gap-1.5 text-primary">
            <span className="w-2 h-2 rounded-full bg-primary" /> Ready
          </span>
          <span className="flex items-center gap-1.5 text-warning">
            <span className="w-2 h-2 rounded-full bg-warning" /> Recovering
          </span>
          <span className="flex items-center gap-1.5 text-destructive">
            <span className="w-2 h-2 rounded-full bg-destructive" /> Fatigued
          </span>
        </div>

        {selectedMuscleLabel && (
          <p className="text-center text-xs text-muted-foreground">
            Selected: <span className="font-semibold text-foreground">{selectedMuscleLabel}</span>
            {selectedGroup ? ` · ${selectedGroup}` : ''}
          </p>
        )}
      </div>

      {selectedDetail && (
        <div
          className={`rounded-[24px] border p-5 space-y-3 ${statusBg[selectedDetail.status]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{selectedDetail.group}</h2>
              <p className={`text-sm font-semibold ${statusStyles[selectedDetail.status]}`}>
                {selectedDetail.status}
              </p>
            </div>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {Math.round(selectedDetail.recoveredPct * 100)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-background/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(selectedDetail.recoveredPct * 100)}%`,
                backgroundColor: STATUS_COLOR[selectedDetail.status],
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Status
              </p>
              <p className="text-sm font-semibold text-foreground">{selectedDetail.label}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Window
              </p>
              <p className="text-sm font-semibold text-foreground">
                {RECOVERY_HOURS[selectedDetail.group]}h recovery
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Last trained
              </p>
              <p className="text-sm font-semibold text-foreground">
                {selectedDetail.lastTrained
                  ? formatDistanceToNow(new Date(selectedDetail.lastTrained), { addSuffix: true })
                  : 'Not yet'}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Last volume
              </p>
              <p className="text-sm font-semibold text-foreground">
                {volumeForGroup(selectedDetail.group) > 0
                  ? `${Math.round(volumeForGroup(selectedDetail.group)).toLocaleString()} kg`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          All muscle groups
        </h3>
        <div className="space-y-2.5">
          {recoveryList.map((item) => {
            const volume = volumeForGroup(item.group)
            const isSelected = selectedGroup === item.group
            return (
              <button
                key={item.group}
                type="button"
                onClick={() => {
                  setSelectedGroup(item.group)
                  setSelectedMuscleSlug(null)
                  setSelectedMuscleLabel(item.group)
                }}
                className={`w-full text-left bg-card border rounded-[20px] p-4 space-y-3 transition-colors cursor-pointer active:scale-[0.99] ${
                  isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLOR[item.status] }}
                    />
                    <span className="text-sm font-bold text-foreground">{item.group}</span>
                  </div>
                  <span className={`text-xs font-bold ${statusStyles[item.status]}`}>
                    {item.status}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(item.recoveredPct * 100)}%`,
                      backgroundColor: STATUS_COLOR[item.status],
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {Math.round(item.recoveredPct * 100)}% recovered
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" />
                    {volume > 0 ? `${Math.round(volume).toLocaleString()} kg` : 'No volume yet'}
                  </span>
                </div>

                {hydrated && item.lastTrained && (
                  <p className="text-[10px] text-muted-foreground">
                    Last session {format(new Date(item.lastTrained), 'EEE, d MMM · h:mm a')}
                    {item.readyAt && item.status !== 'Ready'
                      ? ` · Ready ${format(item.readyAt, 'EEE h:mm a')}`
                      : ''}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
