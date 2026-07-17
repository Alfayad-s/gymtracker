'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot } from 'lucide-react'
import { ChartLine } from '@/components/animate-ui/icons/chart-line'
import { Cherry } from '@/components/animate-ui/icons/cherry'
import { Gauge } from '@/components/animate-ui/icons/gauge'
import { RotateCcw } from '@/components/animate-ui/icons/rotate-ccw'

export function BottomNavigation() {
  const pathname = usePathname()

  const hideNav =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/workout' ||
    pathname === '/ai' ||
    pathname?.startsWith('/auth/')
  if (hideNav) return null

  const isTabActive = (href: string) =>
    pathname === href || Boolean(pathname?.startsWith(`${href}/`))

  const homeActive = isTabActive('/dashboard')
  const historyActive = isTabActive('/history')
  const progressActive = isTabActive('/progress')
  const mealsActive = isTabActive('/meals')

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:max-w-[430px] mx-auto bg-popover/95 backdrop-blur-md border-t border-border pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 z-50">
      <div className="grid grid-cols-5 items-end gap-1">
        <Link
          href="/dashboard"
          replace
          prefetch
          className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
            homeActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gauge
            size={20}
            animateOnTap
            strokeWidth={homeActive ? 2.5 : 2}
            className="h-5 w-5"
          />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <Link
          href="/history"
          replace
          prefetch
          className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
            historyActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <RotateCcw
            size={20}
            animateOnTap
            animation="rotate"
            strokeWidth={historyActive ? 2.5 : 2}
            className="h-5 w-5"
          />
          <span className="text-[10px] font-medium">History</span>
        </Link>

        <div className="flex justify-center -mt-5">
          <Link
            href="/ai"
            aria-label="Open AI chat"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-all cursor-pointer border-4 border-background"
          >
            <Bot className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>

        <Link
          href="/progress"
          replace
          prefetch
          className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
            progressActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChartLine
            size={20}
            animateOnTap
            strokeWidth={progressActive ? 2.5 : 2}
            className="h-5 w-5"
          />
          <span className="text-[10px] font-medium">Progress</span>
        </Link>

        <Link
          href="/meals"
          replace
          prefetch
          className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
            mealsActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cherry
            size={20}
            animateOnTap
            strokeWidth={mealsActive ? 2.5 : 2}
            className="h-5 w-5"
          />
          <span className="text-[10px] font-medium">Meals</span>
        </Link>
      </div>
    </div>
  )
}
