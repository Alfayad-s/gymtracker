'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, Loader2, Upload, Camera, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadZoneProps = {
  disabled?: boolean
  onUploaded: (payload: {
    url: string
    kind: 'image' | 'pdf'
    fileName: string
  }) => void
}

export function UploadZone({ disabled, onUploaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{
    url: string
    kind: 'image' | 'pdf'
    fileName: string
    localUrl?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null)
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const isImage = /^image\/(jpeg|jpg|png|webp)$/i.test(file.type)
      if (!isPdf && !isImage) {
        setError('Use JPG, PNG, or PDF')
        return
      }

      const kind = isPdf ? 'pdf' : 'image'
      const localUrl = isImage ? URL.createObjectURL(file) : undefined
      setPreview({
        url: '',
        kind,
        fileName: file.name,
        localUrl,
      })
      setUploading(true)
      setProgress(12)

      try {
        const form = new FormData()
        form.append('file', file)
        form.append('fileKey', `report-${Date.now().toString(36)}`)

        // Fake progress while waiting — XHR would be heavier
        const tick = window.setInterval(() => {
          setProgress((p) => Math.min(90, p + 8))
        }, 280)

        const res = await fetch('/api/body-composition/media', {
          method: 'POST',
          body: form,
        })
        window.clearInterval(tick)
        const data = (await res.json().catch(() => ({}))) as {
          url?: string
          kind?: 'image' | 'pdf'
          fileName?: string
          error?: string
        }
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Upload failed')
        }
        setProgress(100)
        const payload = {
          url: data.url,
          kind: data.kind ?? kind,
          fileName: data.fileName || file.name,
        }
        setPreview({ ...payload, localUrl })
        onUploaded(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        setPreview(null)
      } finally {
        setUploading(false)
        setTimeout(() => setProgress(0), 600)
      }
    },
    [onUploaded]
  )

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file && !disabled) void uploadFile(file)
        }}
        className={cn(
          'rounded-[24px] border border-dashed p-6 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card/60 backdrop-blur-md',
          disabled && 'opacity-60 pointer-events-none'
        )}
      >
        <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
        <p className="text-sm font-bold text-foreground">Drop InBody report here</p>
        <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, or PDF</p>
        <div className="flex gap-2 justify-center mt-4">
          <button
            type="button"
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
            className="h-10 px-4 rounded-[14px] bg-primary text-primary-foreground text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            Choose file
          </button>
          <button
            type="button"
            disabled={uploading || disabled}
            onClick={() => cameraRef.current?.click()}
            className="h-10 px-4 rounded-[14px] bg-muted border border-border text-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Camera className="w-3.5 h-3.5" />
            Camera
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void uploadFile(file)
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void uploadFile(file)
          }}
        />
      </div>

      {(uploading || progress > 0) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
              Uploading…
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {preview && (
        <div className="rounded-[20px] border border-border bg-card/70 backdrop-blur p-3 flex gap-3 items-center">
          {preview.kind === 'image' && (preview.localUrl || preview.url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.localUrl || preview.url}
              alt=""
              className="w-14 h-14 rounded-xl object-cover border border-border"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{preview.fileName}</p>
            <p className="text-[11px] text-muted-foreground uppercase">{preview.kind}</p>
          </div>
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted cursor-pointer"
            aria-label="Clear preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
