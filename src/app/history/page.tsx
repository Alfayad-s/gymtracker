'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Scale,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useHistoryStore } from '@/stores/historyStore'

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function HistoryPage() {
  const router = useRouter()
  const workouts = useHistoryStore((s) => s.workouts)
  const removeWorkout = useHistoryStore((s) => s.removeWorkout)
  const [hydrated, setHydrated] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const list = hydrated ? workouts : []

  const totals = useMemo(() => {
    return {
      sessions: list.length,
      volume: list.reduce((s, w) => s + w.volumeKg, 0),
      minutes: list.reduce((s, w) => s + w.durationMinutes, 0),
    }
  }, [list])

  return (
    <div className="p-6 space-y-6 pb-8">
      <div className="mt-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Workout History</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Past sessions with duration, volume, and exercises.
        </p>
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-[18px] p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{totals.sessions}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
              Workouts
            </p>
          </div>
          <div className="bg-card border border-border rounded-[18px] p-3 text-center">
            <p className="text-lg font-bold text-primary tabular-nums">
              {(totals.volume / 1000).toFixed(1)}k
            </p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
              Total kg
            </p>
          </div>
          <div className="bg-card border border-border rounded-[18px] p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{totals.minutes}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
              Minutes
            </p>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-[24px]">
          <Dumbbell className="w-8 h-8 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No workouts yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            Finish a session to log date, duration, volume, and every exercise you performed.
          </p>
          <button
            type="button"
            onClick={() => router.push('/workout')}
            className="mt-5 h-11 px-5 rounded-[16px] bg-primary text-primary-foreground text-sm font-bold cursor-pointer"
          >
            Start Workout
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((session) => {
            const expanded = expandedId === session.id
            return (
              <article
                key={session.id}
                className="bg-card border border-border rounded-[24px] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : session.id)}
                  className="w-full p-5 text-left cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-base truncate">{session.name}</h3>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {format(parseISO(session.completedAt), 'EEEE, MMM d, yyyy')}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                        {format(parseISO(session.completedAt), 'h:mm a')}
                      </span>
                    </div>
                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-primary tabular-nums">
                        {session.volumeKg.toLocaleString()} kg
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(session.durationMinutes)}
                      </span>
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                      )}
                    </div>
                  </div>

                  {!expanded && session.exercises.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-3 truncate">
                      {session.exercises.map((e) => e.name).join(' · ')}
                    </p>
                  )}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Scale className="w-3 h-3" />
                      Exercises performed
                    </div>

                    <div className="space-y-2">
                      {session.exercises.map((ex) => (
                        <div
                          key={`${session.id}-${ex.exerciseId}-${ex.name}`}
                          className="bg-muted rounded-[16px] p-3.5 space-y-2"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-sm font-bold text-foreground">{ex.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ex.sets} sets · {Math.round(ex.volumeKg).toLocaleString()} kg volume
                              </p>
                            </div>
                            {ex.bestSet && (
                              <span className="text-[10px] font-bold text-primary shrink-0">
                                Best {ex.bestSet}
                              </span>
                            )}
                          </div>

                          {ex.loggedSets && ex.loggedSets.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-border">
                              <div className="grid grid-cols-3 gap-1">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">
                                  Set
                                </span>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase text-center">
                                  kg
                                </span>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase text-center">
                                  Reps
                                </span>
                              </div>
                              {ex.loggedSets.map((s) => (
                                <div key={s.setNumber} className="grid grid-cols-3 gap-1">
                                  <span className="text-xs text-muted-foreground py-0.5">{s.setNumber}</span>
                                  <span className="text-xs text-foreground font-mono text-center py-0.5">
                                    {s.weight}
                                  </span>
                                  <span className="text-xs text-foreground font-mono text-center py-0.5">
                                    {s.reps}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {session.totalSets} total sets logged
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWorkout(session.id)}
                        className="text-[10px] font-bold text-destructive flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
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
