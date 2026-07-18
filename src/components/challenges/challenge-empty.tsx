'use client'

import { motion } from 'framer-motion'
import { Target } from 'lucide-react'

export function ChallengeEmpty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] border border-dashed border-border/80 bg-card/40 px-5 py-10 text-center space-y-3"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Target className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
          {description}
        </p>
      </div>
    </motion.div>
  )
}
