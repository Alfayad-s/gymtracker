'use client'

import * as React from 'react'
import {
  motion,
  useAnimation,
  type LegacyAnimationControls,
  type SVGMotionProps,
  type Variants,
} from 'framer-motion'

import { cn } from '@/lib/utils'

type Trigger = boolean | string

type AnimateIconContextValue = {
  controls: LegacyAnimationControls | undefined
  animation: string
}

type DefaultIconProps<T = string> = {
  animate?: Trigger
  animateOnHover?: Trigger
  animateOnTap?: Trigger
  animation?: T
}

type IconProps<T = string> = DefaultIconProps<T> &
  Omit<SVGMotionProps<SVGSVGElement>, 'animate'> & {
    size?: number
  }

type IconWrapperProps<T> = IconProps<T> & {
  icon: React.ComponentType<IconProps<T>>
}

const AnimateIconContext = React.createContext<AnimateIconContextValue | null>(null)

function useAnimateIconContext() {
  const context = React.useContext(AnimateIconContext)
  if (!context) {
    return {
      controls: undefined as LegacyAnimationControls | undefined,
      animation: 'default',
    }
  }
  return context
}

function IconWrapper<T extends string>({
  size = 28,
  animation = 'default' as T,
  animate,
  animateOnHover,
  animateOnTap,
  icon: IconComponent,
  className,
  ...props
}: IconWrapperProps<T>) {
  const controls = useAnimation()
  const [currentAnimation, setCurrentAnimation] = React.useState<string>(
    typeof animate === 'string' ? animate : String(animation),
  )
  const [active, setActive] = React.useState(Boolean(animate))
  const runIdRef = React.useRef(0)

  const play = React.useCallback(
    async (trigger: Trigger) => {
      const next = typeof trigger === 'string' ? trigger : String(animation)
      const runId = ++runIdRef.current
      setCurrentAnimation(next)
      setActive(true)
      try {
        await controls.start('animate')
        if (runId !== runIdRef.current) return
        await controls.start('initial')
      } catch {
        // Animation was interrupted
      } finally {
        if (runId === runIdRef.current) setActive(false)
      }
    },
    [animation, controls],
  )

  React.useEffect(() => {
    if (!animate) return
    void play(animate)
    // Only react to explicit animate prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate])

  return (
    <AnimateIconContext.Provider
      value={{ controls, animation: currentAnimation }}
    >
      <motion.span
        className={cn('inline-flex items-center justify-center', className)}
        data-animating={active || undefined}
        onPointerDown={() => {
          if (animateOnTap) void play(animateOnTap)
        }}
        onMouseEnter={() => {
          if (animateOnHover) void play(animateOnHover)
        }}
      >
        <IconComponent size={size} {...props} />
      </motion.span>
    </AnimateIconContext.Provider>
  )
}

function useVariants<
  V extends { default: T; [key: string]: T },
  T extends Record<string, Variants>,
>(animations: V): T {
  const { animation: animationType } = useAnimateIconContext()
  return (animations[animationType as keyof V] as T) ?? animations.default
}

export {
  IconWrapper,
  useAnimateIconContext,
  useVariants,
  type IconProps,
  type IconWrapperProps,
}
