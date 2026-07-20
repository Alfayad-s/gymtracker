'use client'

import { cn } from '@/lib/utils'
import {
  embedSrcWithParams,
  resolveExerciseVideoPreview,
  type ExerciseVideoPreviewSource,
} from '@/lib/exercise-media'

type ExerciseVideoPreviewProps = {
  url: string
  title?: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  fill?: boolean
}

function renderPreview(
  source: ExerciseVideoPreviewSource,
  props: ExerciseVideoPreviewProps
) {
  const { title = 'Exercise demo video', controls = true, autoPlay, muted, loop, fill } =
    props

  if (source.embedSrc) {
    let src = source.embedSrc
    if (autoPlay || muted || loop || !controls) {
      const extra: Record<string, string | number | boolean> = {}
      if (autoPlay) extra.autoplay = 1
      if (muted) extra.mute = 1
      if (!controls) extra.controls = 0
      if (source.kind === 'youtube') {
        extra.playsinline = 1
        extra.modestbranding = 1
        extra.rel = 0
        if (loop) {
          extra.loop = 1
          const id = source.embedSrc.split('/embed/')[1]?.split('?')[0]
          if (id) extra.playlist = id
        }
      }
      if (source.kind === 'vimeo') {
        extra.playsinline = 1
        if (loop) extra.loop = 1
        if (!controls) extra.background = 1
      }
      src = embedSrcWithParams(source.embedSrc, extra)
    }

    return (
      <iframe
        src={src}
        title={title}
        className={cn('h-full w-full border-0', fill && 'pointer-events-none')}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen={controls}
      />
    )
  }

  if (source.directSrc) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={source.directSrc}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted ?? autoPlay}
        loop={loop}
        playsInline
        preload="metadata"
        className={cn('h-full w-full', fill ? 'object-cover scale-105' : 'object-contain')}
      />
    )
  }

  return null
}

export function ExerciseVideoPreview(props: ExerciseVideoPreviewProps) {
  const { url, className } = props
  const source = resolveExerciseVideoPreview(url)

  if (!source) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground',
          className
        )}
      >
        Invalid video URL
      </div>
    )
  }

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-black', className)}>
      {renderPreview(source, props)}
    </div>
  )
}

export function hasExerciseVideoPreview(url: string | undefined): boolean {
  if (!url?.trim()) return false
  return resolveExerciseVideoPreview(url) !== null
}
