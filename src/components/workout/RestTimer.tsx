'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTimerStore } from '@/stores/timerStore'
import { useBackgroundTimer } from '@/hooks/useBackgroundTimer'
import { Pause, Play, SkipForward, Plus, Minus } from 'lucide-react'

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Keeps the timer ticking globally. Compact UI is hidden on /workout (center UI lives there). */
export function RestTimer() {
  const pathname = usePathname()
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

  useBackgroundTimer()

  const clearedRef = useRef(false)
  const onWorkoutPage = pathname === '/workout'

  useEffect(() => {
    if (justFinished && !clearedRef.current) {
      clearedRef.current = true
      const t = setTimeout(() => {
        clearFinished()
        clearedRef.current = false
      }, 2500)
      return () => clearTimeout(t)
    }
    if (!justFinished) clearedRef.current = false
  }, [justFinished, clearFinished])

  // Workout page renders its own big center timer
  if (onWorkoutPage) return null
  if (secondsRemaining <= 0 && !justFinished) return null

  const progress = duration > 0 ? Math.min(1, secondsRemaining / duration) : 0
  const circumference = 2 * Math.PI * 18
  const strokeDash = circumference * progress

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[min(360px,calc(100%-24px))]">
      <div
        className={`rounded-[22px] border backdrop-blur-md px-4 py-3 shadow-2xl transition-colors ${
          justFinished
            ? 'bg-primary/95 border-primary text-primary-foreground'
            : 'bg-card/95 border-border'
        }`}
      >
        {justFinished ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Rest done</p>
              <p className="text-sm font-bold">Time for the next set</p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearFinished()
                stopTimer()
              }}
              className="h-9 px-3 rounded-full bg-background/15 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0">
              <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  className="transition-[stroke-dasharray] duration-1000 linear"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground tabular-nums">
                {Math.ceil(progress * 100)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rest timer</p>
              <p className="text-2xl font-bold text-foreground font-mono tabular-nums leading-none mt-0.5">
                {formatTime(secondsRemaining)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustTimer(-15)}
                className="h-8 w-8 rounded-full bg-muted text-[10px] font-bold text-muted-foreground cursor-pointer active:scale-95"
                aria-label="Minus 15 seconds"
              >
                <Minus className="w-3 h-3 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => adjustTimer(15)}
                className="h-8 w-8 rounded-full bg-muted text-[10px] font-bold text-primary cursor-pointer active:scale-95"
                aria-label="Plus 15 seconds"
              >
                <Plus className="w-3 h-3 mx-auto" />
              </button>
              {isActive ? (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className="h-8 w-8 rounded-full bg-muted text-foreground cursor-pointer active:scale-95"
                  aria-label="Pause"
                >
                  <Pause className="w-3 h-3 mx-auto fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeTimer}
                  className="h-8 w-8 rounded-full bg-primary/20 text-primary cursor-pointer active:scale-95"
                  aria-label="Resume"
                >
                  <Play className="w-3 h-3 mx-auto fill-current" />
                </button>
              )}
              <button
                type="button"
                onClick={stopTimer}
                className="h-8 w-8 rounded-full bg-muted text-destructive cursor-pointer active:scale-95"
                aria-label="Skip rest"
              >
                <SkipForward className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function formatRestTime(totalSeconds: number) {
  return formatTime(totalSeconds)
}
