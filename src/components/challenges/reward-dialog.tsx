'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Coins, PartyPopper, Sparkles, X, Zap } from 'lucide-react'

export function RewardDialog({
  open,
  onClose,
  title,
  xp,
  coins,
  leveledUp,
  level,
  allComplete,
  newBadges,
}: {
  open: boolean
  onClose: () => void
  title: string
  xp: number
  coins: number
  leveledUp?: boolean
  level?: number
  allComplete?: boolean
  newBadges?: string[]
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-full max-w-sm rounded-[28px] border border-border bg-card p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                {allComplete ? (
                  <PartyPopper className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                <h3 className="text-base font-bold text-foreground">
                  {allComplete ? 'All challenges done!' : 'Reward unlocked'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">{title}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[16px] bg-primary/10 border border-primary/20 px-3 py-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">XP</p>
                  <p className="text-lg font-bold text-foreground">+{xp}</p>
                </div>
              </div>
              <div className="rounded-[16px] bg-warning/10 border border-warning/20 px-3 py-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-warning" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Coins</p>
                  <p className="text-lg font-bold text-foreground">+{coins}</p>
                </div>
              </div>
            </div>

            {leveledUp && level != null && (
              <p className="text-sm font-semibold text-primary text-center">
                Level up! You reached level {level}
              </p>
            )}

            {newBadges && newBadges.length > 0 && (
              <div className="rounded-[16px] bg-muted/60 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  New badges
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {newBadges.join(' · ')}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-[16px] bg-primary text-primary-foreground text-sm font-bold cursor-pointer active:scale-[0.98]"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
