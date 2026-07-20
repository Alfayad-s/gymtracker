export type ExerciseVideoPreviewKind = 'youtube' | 'vimeo' | 'embed' | 'direct'

export type ExerciseVideoPreviewSource = {
  kind: ExerciseVideoPreviewKind
  /** iframe src (YouTube, Vimeo, generic embed) */
  embedSrc?: string
  /** <video src> for direct files / CDN links */
  directSrc?: string
}

/** Convert YouTube watch/shorts/youtu.be links to an embed URL. */
export function toYoutubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) return trimmed
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
  } catch {
    return null
  }

  return null
}

function toVimeoEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
    if (host === 'player.vimeo.com' && u.pathname.startsWith('/video/')) {
      return trimmed
    }
  } catch {
    return null
  }

  return null
}

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|mov|m4v|ogv|m3u8)(\?|$)/i

function isDirectVideoUrl(url: string): boolean {
  if (DIRECT_VIDEO_PATTERN.test(url)) return true
  // Cloudinary / CDN video transforms often have /video/upload/
  return /\/video\/upload\//i.test(url)
}

/** Resolve any supported exercise video URL into a preview source. */
export function resolveExerciseVideoPreview(url: string): ExerciseVideoPreviewSource | null {
  const trimmed = url.trim()
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null

  const youtube = toYoutubeEmbedUrl(trimmed)
  if (youtube) return { kind: 'youtube', embedSrc: youtube }

  const vimeo = toVimeoEmbedUrl(trimmed)
  if (vimeo) return { kind: 'vimeo', embedSrc: vimeo }

  if (isDirectVideoUrl(trimmed)) {
    return { kind: 'direct', directSrc: trimmed }
  }

  try {
    const u = new URL(trimmed)
    if (u.pathname.includes('/embed/') || u.pathname.includes('/player/')) {
      return { kind: 'embed', embedSrc: trimmed }
    }
  } catch {
    return null
  }

  // Last resort: treat bare https URLs as direct video (many CDNs have no extension).
  return { kind: 'direct', directSrc: trimmed }
}

export function isYoutubeUrl(url: string): boolean {
  return toYoutubeEmbedUrl(url) !== null
}

export function isHttpVideoUrl(url: string): boolean {
  return resolveExerciseVideoPreview(url) !== null
}

export function isHttpImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  return !isHttpVideoUrl(trimmed)
}

/** Build iframe src with optional autoplay/mute for workout backgrounds. */
export function embedSrcWithParams(
  embedSrc: string,
  params: Record<string, string | number | boolean>
): string {
  try {
    const u = new URL(embedSrc)
    for (const [key, value] of Object.entries(params)) {
      u.searchParams.set(key, String(value))
    }
    return u.toString()
  } catch {
    const sep = embedSrc.includes('?') ? '&' : '?'
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    return `${embedSrc}${sep}${query}`
  }
}
