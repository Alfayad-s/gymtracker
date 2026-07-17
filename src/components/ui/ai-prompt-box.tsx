'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUp,
  BrainCog,
  FolderCode,
  Globe,
  Mic,
  Paperclip,
  Square,
  StopCircle,
  X,
} from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

const styles = `
  textarea.ai-prompt-textarea::-webkit-scrollbar { width: 6px; }
  textarea.ai-prompt-textarea::-webkit-scrollbar-track { background: transparent; }
  textarea.ai-prompt-textarea::-webkit-scrollbar-thumb { background-color: var(--border); border-radius: 3px; }
`

const useStyleInjection = () => {
  React.useEffect(() => {
    const styleId = 'ai-prompt-box-styles'
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const styleSheet = document.createElement('style')
      styleSheet.id = styleId
      styleSheet.innerText = styles
      document.head.appendChild(styleSheet)
    }
  }, [])
}

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-md',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm', className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border bg-card p-0 shadow-xl md:max-w-[800px]',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute top-4 right-4 z-10 rounded-full bg-muted/80 p-2 transition-all hover:bg-muted">
        <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-semibold text-foreground text-lg leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  ({ onSend = () => {}, isLoading = false, placeholder = 'Type your message here...', className }, ref) => {
    useStyleInjection()

    const [input, setInput] = React.useState('')
    const [files, setFiles] = React.useState<File[]>([])
    const [filePreviews, setFilePreviews] = React.useState<Record<string, string>>({})
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null)
    const [isRecording, setIsRecording] = React.useState(false)
    const [recordingSeconds, setRecordingSeconds] = React.useState(0)
    const [showSearch, setShowSearch] = React.useState(false)
    const [showThink, setShowThink] = React.useState(false)
    const [showCanvas, setShowCanvas] = React.useState(false)
    const uploadInputRef = React.useRef<HTMLInputElement>(null)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const recordingStartedAt = React.useRef<number | null>(null)

    React.useEffect(() => {
      if (!textareaRef.current) return
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`
    }, [input])

    React.useEffect(() => {
      if (!isRecording) {
        setRecordingSeconds(0)
        return
      }
      recordingStartedAt.current = Date.now()
      const id = setInterval(() => {
        if (!recordingStartedAt.current) return
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt.current) / 1000))
      }, 250)
      return () => clearInterval(id)
    }, [isRecording])

    const processFile = React.useCallback((file: File) => {
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return
      setFiles([file])
      const reader = new FileReader()
      reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string })
      reader.readAsDataURL(file)
    }, [])

    const handleSubmit = () => {
      if (!input.trim() && files.length === 0) return
      let messagePrefix = ''
      if (showSearch) messagePrefix = '[Search: '
      else if (showThink) messagePrefix = '[Think: '
      else if (showCanvas) messagePrefix = '[Canvas: '
      const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input
      onSend(formattedInput, files)
      setInput('')
      setFiles([])
      setFilePreviews({})
    }

    const stopRecording = () => {
      const duration = recordingSeconds
      setIsRecording(false)
      onSend(`[Voice message - ${duration} seconds]`, [])
    }

    const hasContent = input.trim() !== '' || files.length > 0
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const ModeButton = ({
      active,
      color,
      label,
      icon: Icon,
      onClick,
    }: {
      active: boolean
      color: string
      label: string
      icon: React.ComponentType<{ className?: string }>
      onClick: () => void
    }) => (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-8 items-center gap-1 rounded-full border px-2 py-1 transition-all',
          active
            ? 'border-transparent'
            : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
        )}
        style={
          active
            ? {
                borderColor: color,
                backgroundColor: `${color}26`,
                color,
              }
            : undefined
        }
      >
        <motion.div
          animate={{ rotate: active ? 360 : 0, scale: active ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>
        <AnimatePresence>
          {active && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap text-xs"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    )

    return (
      <>
        <div
          ref={ref}
          className={cn(
            'w-full rounded-md border border-border bg-card px-3 pt-3 pb-2 shadow-sm transition-all duration-300',
            isLoading && 'border-destructive/70',
            isRecording && 'border-destructive/70',
            className
          )}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const dropped = Array.from(e.dataTransfer.files).filter((f) =>
              f.type.startsWith('image/')
            )
            if (dropped[0]) processFile(dropped[0])
          }}
        >
          {files.length > 0 && !isRecording && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={file.name} className="relative h-16 w-16 overflow-hidden rounded-xl">
                  {filePreviews[file.name] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreviews[file.name]}
                      alt={file.name}
                      className="h-full w-full cursor-pointer object-cover"
                      onClick={() => setSelectedImage(filePreviews[file.name])}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFiles((prev) => prev.filter((_, i) => i !== index))
                      setFilePreviews({})
                    }}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isRecording ? (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={isLoading}
              placeholder={
                showSearch
                  ? 'Search the web...'
                  : showThink
                    ? 'Think deeply...'
                    : showCanvas
                      ? 'Create on canvas...'
                      : placeholder
              }
              rows={1}
              className="ai-prompt-textarea min-h-[44px] w-full resize-none border-none bg-transparent px-0 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50"
            />
          ) : (
            <div className="flex w-full flex-col items-center justify-center py-3">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                <span className="font-mono text-sm text-muted-foreground">{formatTime(recordingSeconds)}</span>
              </div>
              <div className="flex h-10 w-full items-center justify-center gap-0.5 px-4">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 animate-pulse rounded-full bg-foreground/40"
                    style={{
                      height: `${Math.max(15, ((i * 37) % 100))}%`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div
              className={cn(
                'flex items-center gap-1',
                isRecording && 'invisible h-0 opacity-0'
              )}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Upload image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) processFile(file)
                  e.target.value = ''
                }}
              />

              <ModeButton
                active={showSearch}
                color="#1EAEDB"
                label="Search"
                icon={Globe}
                onClick={() => {
                  setShowSearch((v) => !v)
                  setShowThink(false)
                }}
              />
              <div className="mx-1 h-6 w-[1.5px] bg-gradient-to-t from-transparent via-border to-transparent" />
              <ModeButton
                active={showThink}
                color="#8B5CF6"
                label="Think"
                icon={BrainCog}
                onClick={() => {
                  setShowThink((v) => !v)
                  setShowSearch(false)
                }}
              />
              <div className="mx-1 h-6 w-[1.5px] bg-gradient-to-t from-transparent via-border to-transparent" />
              <ModeButton
                active={showCanvas}
                color="#F97316"
                label="Canvas"
                icon={FolderCode}
                onClick={() => setShowCanvas((v) => !v)}
              />
            </div>

            <button
              type="button"
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
                isRecording
                  ? 'bg-transparent text-destructive hover:bg-muted'
                  : hasContent
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => {
                if (isRecording) stopRecording()
                else if (hasContent) handleSubmit()
                else setIsRecording(true)
              }}
              disabled={isLoading && !hasContent}
              aria-label={
                isLoading
                  ? 'Stop generation'
                  : isRecording
                    ? 'Stop recording'
                    : hasContent
                      ? 'Send message'
                      : 'Voice message'
              }
            >
              {isLoading ? (
                <Square className="h-4 w-4 animate-pulse fill-primary-foreground" />
              ) : isRecording ? (
                <StopCircle className="h-5 w-5 text-destructive" />
              ) : hasContent ? (
                <ArrowUp className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:max-w-[800px]">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            {selectedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedImage}
                alt="Full preview"
                className="max-h-[80vh] w-full rounded-2xl object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

PromptInputBox.displayName = 'PromptInputBox'
