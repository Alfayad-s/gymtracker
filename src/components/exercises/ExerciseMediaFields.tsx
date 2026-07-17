'use client'

import { useRef, useState } from 'react'
import { Camera, Film, Loader2, Trash2, ImageIcon } from 'lucide-react'
import { DEFAULT_EXERCISE_IMAGE } from '@/data/exercises'
import { cn } from '@/lib/utils'

type ExerciseMediaFieldsProps = {
  imageUrl: string
  videoUrl: string
  exerciseKey?: string
  onImageUrlChange: (url: string) => void
  onVideoUrlChange: (url: string) => void
}

async function uploadMedia(
  file: File,
  kind: 'image' | 'video',
  exerciseKey?: string
): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  if (exerciseKey) form.append('exerciseKey', exerciseKey)

  const res = await fetch('/api/exercises/media', {
    method: 'POST',
    body: form,
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Failed to upload ${kind}`)
  }
  return data.url
}

export function ExerciseMediaFields({
  imageUrl,
  videoUrl,
  exerciseKey,
  onImageUrlChange,
  onVideoUrlChange,
}: ExerciseMediaFieldsProps) {
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasCustomPhoto = Boolean(imageUrl && imageUrl !== DEFAULT_EXERCISE_IMAGE)

  const handlePick = async (
    file: File | undefined,
    kind: 'image' | 'video'
  ) => {
    if (!file) return
    setError(null)
    setUploading(kind)
    try {
      const url = await uploadMedia(file, kind, exerciseKey)
      if (kind === 'image') onImageUrlChange(url)
      else onVideoUrlChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to upload ${kind}`)
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Photo
        </label>
        <div className="rounded-[20px] border border-border bg-muted/40 overflow-hidden">
          <div className="relative aspect-[16/10] bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl || DEFAULT_EXERCISE_IMAGE}
              alt="Exercise photo preview"
              className="w-full h-full object-cover"
            />
            {uploading === 'image' && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-2 p-3">
            <button
              type="button"
              disabled={uploading !== null}
              onClick={() => photoRef.current?.click()}
              className={cn(
                'flex-1 h-11 rounded-[14px] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-60',
                'bg-primary text-primary-foreground'
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              {hasCustomPhoto ? 'Change photo' : 'Add photo'}
            </button>
            {hasCustomPhoto && (
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => onImageUrlChange(DEFAULT_EXERCISE_IMAGE)}
                className="h-11 px-3 rounded-[14px] bg-card border border-border text-muted-foreground cursor-pointer active:scale-95 disabled:opacity-60"
                aria-label="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handlePick(e.target.files?.[0], 'image')
            e.target.value = ''
          }}
        />
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          JPG / PNG / WEBP · max 5MB · sign in required
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Demo video
        </label>
        <div className="rounded-[20px] border border-border bg-muted/40 overflow-hidden">
          {videoUrl ? (
            <div className="relative aspect-video bg-black">
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
              {uploading === 'video' && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground bg-background">
              {uploading === 'video' ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <>
                  <Film className="w-7 h-7 opacity-60" />
                  <p className="text-xs">Optional form / demo clip</p>
                </>
              )}
            </div>
          )}
          <div className="flex gap-2 p-3">
            <button
              type="button"
              disabled={uploading !== null}
              onClick={() => videoRef.current?.click()}
              className="flex-1 h-11 rounded-[14px] bg-primary/15 border border-primary/25 text-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              <Film className="w-3.5 h-3.5" />
              {videoUrl ? 'Replace video' : 'Add video'}
            </button>
            {videoUrl && (
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => onVideoUrlChange('')}
                className="h-11 px-3 rounded-[14px] bg-card border border-border text-muted-foreground cursor-pointer active:scale-95 disabled:opacity-60"
                aria-label="Remove video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handlePick(e.target.files?.[0], 'video')
            e.target.value = ''
          }}
        />
        <p className="text-[10px] text-muted-foreground">MP4 / WEBM / MOV · max 50MB</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
