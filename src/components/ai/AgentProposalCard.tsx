'use client'

import { AlertTriangle, Check, Loader2, X } from 'lucide-react'
import type { AgentProposal, AgentProposalStatus } from '@/lib/ai/agent-types'

type AgentProposalCardProps = {
  proposal: AgentProposal
  onConfirm: () => void
  onCancel: () => void
}

function riskBadgeClass(risk: 'low' | 'medium' | 'high') {
  switch (risk) {
    case 'high':
      return 'bg-destructive/15 text-destructive border-destructive/25'
    case 'medium':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function statusLabel(status: AgentProposalStatus) {
  switch (status) {
    case 'pending':
      return 'Awaiting confirmation'
    case 'executing':
      return 'Applying changes…'
    case 'succeeded':
      return 'Changes applied'
    case 'failed':
      return 'Failed to apply'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function AgentProposalCard({ proposal, onConfirm, onCancel }: AgentProposalCardProps) {
  const isPending = proposal.status === 'pending'
  const isExecuting = proposal.status === 'executing'
  const hasHighRisk = proposal.actions.some((a) => a.risk === 'high')

  return (
    <div className="rounded-[18px] border border-primary/25 bg-primary/5 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-primary/15 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          Proposed changes
        </p>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {statusLabel(proposal.status)}
        </span>
      </div>

      <div className="px-3.5 py-3 space-y-2">
        <p className="text-sm text-foreground leading-relaxed">{proposal.summary}</p>

        <ul className="space-y-1.5">
          {proposal.actions.map((action, index) => (
            <li
              key={`${action.action}-${index}`}
              className="flex items-start gap-2 text-xs text-foreground/90"
            >
              <span
                className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase ${riskBadgeClass(action.risk)}`}
              >
                {action.risk}
              </span>
              <span className="leading-relaxed">{action.label}</span>
            </li>
          ))}
        </ul>

        {hasHighRisk && isPending && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive leading-relaxed">
              This includes destructive changes. Review carefully before confirming.
            </p>
          </div>
        )}

        {proposal.error && (
          <p className="text-[11px] text-destructive leading-relaxed">{proposal.error}</p>
        )}
      </div>

      {isPending && (
        <div className="px-3.5 pb-3 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Check className="w-3.5 h-3.5" />
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-3 rounded-xl bg-card border border-border text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      )}

      {isExecuting && (
        <div className="px-3.5 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          Applying…
        </div>
      )}
    </div>
  )
}
