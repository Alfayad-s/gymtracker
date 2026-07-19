'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bot, Volume2, VolumeX } from 'lucide-react'
import { AgentProposalCard } from '@/components/ai/AgentProposalCard'
import { FormattedAiMessage } from '@/components/body-composition/AnalysisSections'
import { PromptInputBox } from '@/components/ui/ai-prompt-box'
import type { AgentProposal } from '@/lib/ai/agent-types'
import { buildAgentContext } from '@/lib/ai/build-agent-context'
import { executeAgentActions } from '@/lib/ai/execute-agent-actions'
import { stripMarkdown } from '@/lib/body-composition/parse-analysis'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  animate?: boolean
  proposal?: AgentProposal
}

const STARTERS = [
  'Build me a push day workout',
  'What should I train today?',
  'Start a chest workout for me',
  'Log 80kg bench for set 1',
  'Set my goal weight to 75kg',
  'Switch to dark theme',
]

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function TypewriterText({
  text,
  enabled,
  onComplete,
}: {
  text: string
  enabled: boolean
  onComplete?: () => void
}) {
  const [shown, setShown] = useState(enabled ? '' : text)
  const doneRef = useRef(!enabled)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!enabled) {
      setShown(text)
      return
    }

    doneRef.current = false
    setShown('')
    let index = 0
    const step = Math.max(1, Math.ceil(text.length / 180))
    const id = window.setInterval(() => {
      index = Math.min(text.length, index + step)
      setShown(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(id)
        if (!doneRef.current) {
          doneRef.current = true
          onCompleteRef.current?.()
        }
      }
    }, 18)

    return () => window.clearInterval(id)
  }, [text, enabled])

  return (
    <>
      {shown}
      {enabled && shown.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] ml-0.5 align-[-0.1em] bg-primary/80 animate-pulse" />
      )}
    </>
  )
}

export default function AiChatPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const profileAvatarUrl = useProfileStore((s) => s.avatarUrl)
  const avatarUrl =
    profileAvatarUrl ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null
  const userInitial =
    user?.user_metadata?.full_name?.charAt(0) ||
    user?.user_metadata?.name?.charAt(0) ||
    user?.email?.charAt(0) ||
    'U'

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi, I am your GymTrack AI agent. I can answer workout questions and propose app changes — plans, workouts, history, progress, and settings — after you confirm each action.',
      animate: false,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRagHits, setLastRagHits] = useState(0)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const executingRef = useRef(false)

  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeakingId(null)
  }, [])

  const readAloud = useCallback(
    (message: ChatMessage) => {
      if (!speechSupported) return

      if (speakingId === message.id) {
        stopSpeaking()
        return
      }

      stopSpeaking()
      const utterance = new SpeechSynthesisUtterance(stripMarkdown(message.content))
      utterance.rate = 1
      utterance.pitch = 1
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)
      setSpeakingId(message.id)
      window.speechSynthesis.speak(utterance)
    },
    [speakingId, speechSupported, stopSpeaking]
  )

  const markTyped = useCallback((id: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, animate: false } : message
      )
    )
  }, [])

  const updateProposal = useCallback(
    (messageId: string, patch: Partial<AgentProposal>) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId && message.proposal
            ? { ...message, proposal: { ...message.proposal, ...patch } }
            : message
        )
      )
    },
    []
  )

  const handleConfirmProposal = useCallback(
    async (messageId: string) => {
      if (executingRef.current) return

      const message = messages.find((m) => m.id === messageId)
      if (!message?.proposal || message.proposal.status !== 'pending') return

      executingRef.current = true
      stopSpeaking()
      updateProposal(messageId, { status: 'executing', error: undefined })

      try {
        const result = executeAgentActions(message.proposal.actions)
        if (!result.ok) {
          updateProposal(messageId, {
            status: 'failed',
            error: result.error ?? 'One or more actions failed',
          })
          return
        }

        updateProposal(messageId, { status: 'succeeded' })
        setMessages((current) => [
          ...current,
          {
            id: uid(),
            role: 'assistant',
            content: `Done. ${result.results.map((r) => r.message).join(' ')}`,
            animate: true,
          },
        ])
      } catch (err) {
        updateProposal(messageId, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Execution failed',
        })
      } finally {
        executingRef.current = false
      }
    },
    [messages, stopSpeaking, updateProposal]
  )

  const handleCancelProposal = useCallback(
    (messageId: string) => {
      updateProposal(messageId, { status: 'cancelled' })
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: 'assistant',
          content: 'Cancelled — no changes were made.',
          animate: true,
        },
      ])
    },
    [updateProposal]
  )

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const hasPending = messages.some((m) => m.proposal?.status === 'pending')
    if (hasPending) {
      setError('Please confirm or cancel the pending proposal first.')
      return
    }

    stopSpeaking()

    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: uid(), role: 'user', content: trimmed },
    ]
    setMessages(nextMessages)
    setError(null)
    setIsLoading(true)

    try {
      const context = buildAgentContext()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.proposal))
            .map(({ role, content }) => ({ role, content })),
          context,
        }),
      })
      const data = (await res.json()) as {
        message?: {
          role: 'assistant'
          content: string
          proposal?: Omit<AgentProposal, 'status'>
        }
        error?: string
        ragHits?: number
      }

      if (!res.ok) {
        throw new Error(data.error || 'AI is unavailable right now')
      }

      if (!data.message) {
        throw new Error('AI returned an empty response')
      }

      setLastRagHits(typeof data.ragHits === 'number' ? data.ragHits : 0)

      const assistantMessage: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: data.message.content,
        animate: true,
      }

      if (data.message.proposal) {
        assistantMessage.proposal = {
          ...data.message.proposal,
          status: 'pending',
        }
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI is unavailable right now')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-0 p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground tracking-tight">GymTrack AI</h1>
            <p className="text-[11px] text-muted-foreground">
              Agentic workout coach
              {lastRagHits > 0 ? ` · Using ${lastRagHits} memory hit${lastRagHits === 1 ? '' : 's'}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4 pb-[220px]">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const isSpeaking = speakingId === message.id
          const showReadAloud =
            !isUser && speechSupported && !message.animate && !message.proposal

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}

              <div className={`max-w-[85%] ${isUser ? '' : 'space-y-2'}`}>
                {isUser ? (
                  <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground rounded-[22px]">
                    {message.content}
                  </div>
                ) : message.animate ? (
                  <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-card border border-border text-foreground rounded-[22px]">
                    <TypewriterText
                      text={stripMarkdown(message.content)}
                      enabled
                      onComplete={() => markTyped(message.id)}
                    />
                  </div>
                ) : (
                  <FormattedAiMessage text={message.content} />
                )}

                {message.proposal && !message.animate && (
                  <AgentProposalCard
                    proposal={message.proposal}
                    onConfirm={() => void handleConfirmProposal(message.id)}
                    onCancel={() => handleCancelProposal(message.id)}
                  />
                )}

                {showReadAloud && (
                  <button
                    type="button"
                    onClick={() => readAloud(message)}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer active:scale-95 ${
                      isSpeaking
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label={isSpeaking ? 'Stop reading' : 'Read response'}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Read
                      </>
                    )}
                  </button>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-primary uppercase">
                      {userInitial}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-[22px] px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-[16px] bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 sm:max-w-[430px] mx-auto bg-background/95 backdrop-blur-md border-t border-border pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-30">
        <div className="overflow-x-auto scrollbar-hide px-4 pb-3">
          <div className="flex gap-2 w-max">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void sendMessage(starter)}
                disabled={isLoading}
                className="shrink-0 h-9 px-3.5 rounded-full bg-card/60 border border-border/60 text-xs font-semibold text-foreground/55 cursor-pointer active:scale-95 disabled:opacity-40 whitespace-nowrap hover:text-foreground/80 hover:bg-card/80 transition-colors"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <PromptInputBox
            isLoading={isLoading}
            placeholder="Ask or tell me what to change in GymTrack..."
            onSend={(message) => {
              void sendMessage(message)
            }}
          />
        </div>
      </div>
    </div>
  )
}
