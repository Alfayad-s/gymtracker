'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function CalendarPage() {
  const router = useRouter()
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1)
  const activeDays = [3, 4, 5, 8, 10, 11, 14, 15, 17, 22, 24, 25, 29, 30]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Calendar</h1>
      </div>

      <div className="bg-card border border-border rounded-[24px] p-5 space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-bold text-foreground">July 2026</span>
          <span className="text-xs text-muted-foreground font-medium">{activeDays.length} Workouts</span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
            <span key={idx} className="text-[10px] font-bold text-muted-foreground uppercase">
              {d}
            </span>
          ))}

          {daysInMonth.map((day) => {
            const isActive = activeDays.includes(day)
            return (
              <div
                key={day}
                className={`aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all relative ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-muted border border-border text-muted-foreground'
                }`}
              >
                {day}
                {isActive && (
                  <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Monthly Highlights</h3>
        <div className="bg-card border border-border rounded-[24px] p-5 space-y-4">
          <div className="flex gap-4 items-start">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Consistent Streak</h4>
              <p className="text-xs text-muted-foreground mt-0.5">You completed 3 workouts in a row twice this month.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
