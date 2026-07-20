'use client'

import { Pause, Play, SkipForward, Plus, Minus } from 'lucide-react'
import { useTimerStore } from '@/stores/timerStore'
import { formatRestTime } from '@/components/workout/RestTimer'
import { WorkoutNextExercisePreview } from '@/components/workout/WorkoutNextExercisePreview'

type RestNextExercise = {
  exerciseId: string
  name: string
  equipment?: string
  setLabel: string
}

type WorkoutRestCircleProps = {
  nextExercise?: RestNextExercise | null
}

/** Large centered circular rest timer for the active workout page. */
export function WorkoutRestCircle({ nextExercise }: WorkoutRestCircleProps) {
  const {
    secondsRemaining,
    duration,
    isActive,
    justFinished,
    pauseTimer,
    resumeTimer,
    stopTimer,
    adjustTimer,
    clearFinished,
  } = useTimerStore()

  const isResting = secondsRemaining > 0 || justFinished
  if (!isResting) return null

  const progress = duration > 0 ? Math.min(1, secondsRemaining / duration) : 0
  const size = 260
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference * (justFinished ? 0 : progress)

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-6">
        {justFinished ? 'Rest complete' : 'Rest timer'}
      </p>

      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-1000 linear"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {justFinished ? (
            <>
              <p className="text-lg font-bold text-primary">Ready!</p>
              <p className="text-xs text-muted-foreground mt-1">Next set</p>
            </>
          ) : (
            <>
              <p className="text-5xl font-bold text-foreground font-mono tabular-nums tracking-tight leading-none">
                {formatRestTime(secondsRemaining)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-semibold uppercase tracking-wider">
                {isActive ? 'Resting' : 'Paused'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        {!justFinished && (
          <>
            <button
              type="button"
              onClick={() => adjustTimer(-15)}
              className="h-12 w-12 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Minus 15 seconds"
            >
              <Minus className="w-4 h-4" />
            </button>
            {isActive ? (
              <button
                type="button"
                onClick={pauseTimer}
                className="h-14 w-14 rounded-full bg-card border border-border text-foreground flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                aria-label="Pause"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeTimer}
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer active:scale-95 shadow-lg shadow-primary/20"
                aria-label="Resume"
              >
                <Play className="w-5 h-5 fill-current" />
              </button>
            )}
            <button
              type="button"
              onClick={() => adjustTimer(15)}
              className="h-12 w-12 rounded-full bg-muted border border-border text-primary flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Plus 15 seconds"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {nextExercise && (
        <WorkoutNextExercisePreview
          exerciseId={nextExercise.exerciseId}
          name={nextExercise.name}
          equipment={nextExercise.equipment}
          setLabel={nextExercise.setLabel}
        />
      )}

      <button
        type="button"
        onClick={() => {
          clearFinished()
          stopTimer()
        }}
        className="mt-6 h-12 px-6 rounded-[16px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
      >
        <SkipForward className="w-4 h-4" />
        {justFinished ? 'Start next set' : 'Skip rest'}
      </button>
    </div>
  )
}
