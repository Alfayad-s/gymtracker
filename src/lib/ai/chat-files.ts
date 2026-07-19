/** Compress an image File to a JPEG data URL suitable for vision + localStorage. */
export async function fileToCompressedDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number }
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 1280
  const quality = opts?.quality ?? 0.72

  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', quality)
}

export async function readTextFile(file: File, maxChars = 12_000): Promise<string> {
  const raw = await file.text()
  const trimmed = raw.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}\n\n…[truncated]`
}

export function isSupportedChatFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (file.type.startsWith('text/')) return true
  const name = file.name.toLowerCase()
  return /\.(txt|md|csv|json|log)$/i.test(name)
}
