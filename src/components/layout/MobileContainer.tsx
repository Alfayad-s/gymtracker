import React from 'react'

interface MobileContainerProps {
  children: React.ReactNode
}

export function MobileContainer({ children }: MobileContainerProps) {
  return (
    <div className="w-full min-h-[100dvh] mx-auto bg-background text-foreground relative flex flex-col overflow-x-hidden scrollbar-hide sm:max-w-[430px] sm:min-h-screen sm:border-x sm:border-border sm:shadow-2xl">
      {children}
    </div>
  )
}
