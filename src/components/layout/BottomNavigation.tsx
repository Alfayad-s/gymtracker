'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Home, History, TrendingUp, User } from 'lucide-react'

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

  const leftItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'History', href: '/history', icon: History },
  ]

  const rightItems = [
    { name: 'Progress', href: '/progress', icon: TrendingUp },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  const isTabActive = (href: string) =>
    pathname === href || Boolean(pathname?.startsWith(`${href}/`))

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:max-w-[430px] mx-auto bg-popover/95 backdrop-blur-md border-t border-border pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 z-50">
      <div className="grid grid-cols-5 items-end gap-1">
        {leftItems.map((item) => {
          const Icon = item.icon
          const isActive = isTabActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              // Tab switches should replace history so Progress/Home don't stack twice.
              replace
              prefetch
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          )
        })}

        <div className="flex justify-center -mt-5">
          <Link
            href="/ai"
            aria-label="Open AI chat"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-all cursor-pointer border-4 border-background"
          >
            <Bot className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>

        {rightItems.map((item) => {
          const Icon = item.icon
          const isActive = isTabActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              replace
              prefetch
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
