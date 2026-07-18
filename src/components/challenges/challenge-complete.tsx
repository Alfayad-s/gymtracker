'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

export function ChallengeComplete({
  title = 'Challenge complete',
  subtitle,
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-[20px] border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3"
    >
      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  )
}
