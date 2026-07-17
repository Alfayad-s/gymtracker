'use client'

import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-background">
      <div className="w-16 h-16 bg-primary/15 rounded-[24px] flex items-center justify-center mb-6 border border-primary/20">
        <Dumbbell className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground tracking-tight">404 — Page Not Found</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-[260px]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[24px] flex items-center justify-center transition-all active:scale-95 text-sm"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
