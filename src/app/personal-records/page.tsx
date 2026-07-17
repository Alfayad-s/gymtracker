'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Dumbbell,
  Scale,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { useHistoryStore } from '@/stores/historyStore'
import { computePersonalRecords } from '@/lib/workout-analytics'

type FilterTab = 'all' | '1rm' | 'heaviest' | 'volume'

export default function PersonalRecordsPage() {
  const router = useRouter()
  const workouts = useHistoryStore((s) => s.workouts)
  const [hydrated, setHydrated] = useState(false)
  const [tab, setTab] = useState<FilterTab>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const records = useMemo(
    () => (hydrated ? computePersonalRecords(workouts) : []),
    [hydrated, workouts]
  )

  const sorted = useMemo(() => {
    const list = [...records]
    switch (tab) {
      case '1rm':
        return list.sort((a, b) => b.estimated1RM.value - a.estimated1RM.value)
      case 'heaviest':
        return list.sort((a, b) => b.heaviestLift.weight - a.heaviestLift.weight)
      case 'volume':
        return list.sort((a, b) => b.highestVolumeSet.volumeKg - a.highestVolumeSet.volumeKg)
      default:
        return list
    }
  }, [records, tab])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: '1rm', label: 'Est. 1RM' },
    { id: 'heaviest', label: 'Heaviest' },
    { id: 'volume', label: 'Volume' },
  ]

  return (
    <div className="p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Personal Records</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Auto-detected from your workout history
          </p>
        </div>
      </div>

      {records.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border rounded-[16px] p-3 text-center">
              <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground tabular-nums">
                {records.length > 0
                  ? Math.max(...records.map((r) => r.estimated1RM.value))
                  : 0}{' '}
                kg
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Best 1RM</p>
            </div>
            <div className="bg-card border border-border rounded-[16px] p-3 text-center">
              <Trophy className="w-4 h-4 text-warning mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground tabular-nums">
                {records.length > 0
                  ? Math.max(...records.map((r) => r.heaviestLift.weight))
                  : 0}{' '}
                kg
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Heaviest</p>
            </div>
            <div className="bg-card border border-border rounded-[16px] p-3 text-center">
              <Scale className="w-4 h-4 text-sky-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground tabular-nums">
                {records.length > 0
                  ? Math.max(...records.map((r) => r.highestVolumeSet.volumeKg))
                  : 0}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Best Set Vol.</p>
            </div>
          </div>
        </>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-[24px]">
          <Trophy className="w-8 h-8 text-warning/60 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No records yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            Complete sets with weight and reps — we&apos;ll automatically detect heaviest lifts,
            highest volume sets, and estimated 1RM.
          </p>
          <button
            type="button"
            onClick={() => router.push('/workout')}
            className="mt-5 h-11 px-5 rounded-[16px] bg-primary text-primary-foreground text-sm font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Dumbbell className="w-4 h-4" />
            Start Workout
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((pr) => {
            const expanded = expandedId === pr.exerciseId
            const headline =
              tab === 'heaviest'
                ? `${pr.heaviestLift.weight} kg × ${pr.heaviestLift.reps}`
                : tab === 'volume'
                  ? `${Math.round(pr.highestVolumeSet.volumeKg)} kg set`
                  : `${pr.estimated1RM.value} kg est. 1RM`

            const headlineDate =
              tab === 'heaviest'
                ? pr.heaviestLift.date
                : tab === 'volume'
                  ? pr.highestVolumeSet.date
                  : pr.estimated1RM.date

            return (
              <article
                key={pr.exerciseId}
                className="bg-card border border-border rounded-[24px] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : pr.exerciseId)}
                  className="w-full p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20 shrink-0">
                      <Trophy className="w-4 h-4 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{pr.exerciseName}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {format(parseISO(headlineDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-base font-bold text-primary block tabular-nums">
                        {headline}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        {tab === 'all' ? 'Est. 1RM' : tabs.find((t) => t.id === tab)?.label}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                    <RecordRow
                      icon={<Trophy className="w-3.5 h-3.5 text-warning" />}
                      label="Heaviest lift"
                      value={`${pr.heaviestLift.weight} kg × ${pr.heaviestLift.reps} reps`}
                      date={pr.heaviestLift.date}
                      workout={pr.heaviestLift.workoutName}
                    />
                    <RecordRow
                      icon={<Scale className="w-3.5 h-3.5 text-sky-500" />}
                      label="Highest volume set"
                      value={`${Math.round(pr.highestVolumeSet.volumeKg)} kg (${pr.highestVolumeSet.weight} × ${pr.highestVolumeSet.reps})`}
                      date={pr.highestVolumeSet.date}
                      workout={pr.highestVolumeSet.workoutName}
                    />
                    <RecordRow
                      icon={<TrendingUp className="w-3.5 h-3.5 text-primary" />}
                      label="Estimated 1RM"
                      value={`${pr.estimated1RM.value} kg (from ${pr.estimated1RM.weight} × ${pr.estimated1RM.reps})`}
                      date={pr.estimated1RM.date}
                      workout={pr.estimated1RM.workoutName}
                    />
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecordRow({
  icon,
  label,
  value,
  date,
  workout,
}: {
  icon: React.ReactNode
  label: string
  value: string
  date: string
  workout: string
}) {
  return (
    <div className="bg-muted rounded-[14px] p-3 flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {format(parseISO(date), 'MMM d, yyyy')} · {workout}
        </p>
      </div>
    </div>
  )
}
