'use client'

import type { DailyChallenge } from '@/lib/challenges/types'
import { ChallengeCard } from './challenge-card'
import { ChallengeEmpty } from './challenge-empty'

export function ChallengeList({
  challenges,
  emptyTitle,
  emptyDescription,
  onComplete,
  onSkip,
  onIncrement,
  busyId,
}: {
  challenges: DailyChallenge[]
  emptyTitle?: string
  emptyDescription?: string
  onComplete?: (id: string) => void
  onSkip?: (id: string) => void
  onIncrement?: (id: string) => void
  busyId?: string | null
}) {
  if (!challenges.length) {
    return (
      <ChallengeEmpty
        title={emptyTitle ?? 'No challenges'}
        description={emptyDescription ?? 'Nothing here yet.'}
      />
    )
  }

  return (
    <div className="space-y-3">
      {challenges.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          busy={busyId === c.id}
          onComplete={onComplete ? () => onComplete(c.id) : undefined}
          onSkip={onSkip ? () => onSkip(c.id) : undefined}
          onIncrement={onIncrement ? () => onIncrement(c.id) : undefined}
        />
      ))}
    </div>
  )
}
