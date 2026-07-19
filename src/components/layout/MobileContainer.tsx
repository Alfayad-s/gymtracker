'use client'

import { usePathname } from 'next/navigation'

interface MobileContainerProps {
  children: React.ReactNode
}

export function MobileContainer({ children }: MobileContainerProps) {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return (
    <div
      className={
        isLanding
          ? 'w-full min-h-[100dvh] mx-auto bg-background text-foreground relative flex flex-col overflow-x-hidden scrollbar-hide'
          : 'w-full min-h-[100dvh] mx-auto bg-background text-foreground relative flex flex-col overflow-x-hidden scrollbar-hide sm:max-w-[430px] sm:min-h-screen sm:border-x sm:border-border sm:shadow-2xl'
      }
    >
      {children}
    </div>
  )
}
