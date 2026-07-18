import 'server-only'

import { completeGroqVisionChat } from '@/lib/groq'
import { bodyCompositionPreviewUrl } from '@/lib/cloudinary'

/**
 * Lightweight PDF text-layer extraction (no pdfjs).
 * Pulls printable strings from PDF content streams / literal strings.
 */
export function extractPdfTextLayer(buffer: Buffer): string {
  const raw = buffer.toString('latin1')
  const chunks: string[] = []

  // (...) string literals
  const literalRe = /\((?:\\.|[^\\)])+\)/g
  let match: RegExpExecArray | null
  while ((match = literalRe.exec(raw)) != null) {
    const inner = match[0].slice(1, -1)
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    if (/[A-Za-z0-9]/.test(inner) && inner.trim().length > 1) {
      chunks.push(inner.trim())
    }
  }

  // Hex strings <...>
  const hexRe = /<([0-9A-Fa-f\s]+)>/g
  while ((match = hexRe.exec(raw)) != null) {
    const hex = match[1].replace(/\s/g, '')
    if (hex.length < 4 || hex.length % 2 !== 0) continue
    try {
      let s = ''
      for (let i = 0; i < hex.length; i += 2) {
        s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
      }
      if (/[A-Za-z0-9]/.test(s) && s.trim().length > 1) chunks.push(s.trim())
    } catch {
      // skip
    }
  }

  return chunks.join(' ').replace(/\s+/g, ' ').trim()
}

export async function visionTranscribeImage(imageUrl: string): Promise<string> {
  return completeGroqVisionChat([
    {
      role: 'system',
      content:
        'You are an OCR transcription engine for InBody/BIA body composition reports. Return plain text only — every readable number and label. No markdown.',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Transcribe all readable text from this body composition report image.',
        },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ])
}

export type ExtractTextResult = {
  rawText: string
  method: 'pdf-text' | 'vision'
}

export async function extractDocumentText(params: {
  url: string
  kind: 'image' | 'pdf'
  buffer?: Buffer
}): Promise<ExtractTextResult> {
  if (params.kind === 'pdf' && params.buffer) {
    const layer = extractPdfTextLayer(params.buffer)
    if (layer.length >= 80) {
      return { rawText: layer, method: 'pdf-text' }
    }
  }

  const previewUrl = bodyCompositionPreviewUrl(params.url, params.kind)
  const rawText = await visionTranscribeImage(previewUrl)
  return { rawText: rawText.trim(), method: 'vision' }
}
