import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-6 py-12 bg-background text-foreground">
      <div className="flex-1 flex flex-col items-center justify-center text-center mt-12">
        <div className="w-20 h-20 bg-primary/15 rounded-[24px] flex items-center justify-center mb-8 border border-primary/20 animate-pulse">
          <Dumbbell className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-foreground">
          Gym<span className="text-primary">Track</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
          Log workouts instantly, track progress with premium analytics, and hit your fitness milestones.
        </p>
      </div>

      <div className="w-full flex flex-col gap-4">
        <Link
          href="/login"
          className="w-full flex items-center justify-center h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[24px] transition-all duration-200 active:scale-[0.98] shadow-lg shadow-primary/20"
        >
          Get Started
        </Link>
      </div>
    </div>
  )
}
