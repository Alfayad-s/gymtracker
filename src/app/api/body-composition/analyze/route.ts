import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { completeGroqTextChat, completeGroqVisionChat } from '@/lib/groq'
import { extractDocumentText } from '@/lib/ocr/extract-text'
import { bodyCompositionPreviewUrl } from '@/lib/cloudinary'
import { EXTRACT_JSON_PROMPT } from '@/lib/body-composition/types'
import { parseBodyCompositionJson } from '@/lib/body-composition/parse-report'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { fileUrl?: string; kind?: 'image' | 'pdf' }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : ''
  const kind = body.kind === 'pdf' ? 'pdf' : 'image'
  if (!fileUrl) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }

  try {
    let buffer: Buffer | undefined
    try {
      const res = await fetch(fileUrl)
      if (res.ok) buffer = Buffer.from(await res.arrayBuffer())
    } catch {
      // continue without buffer — vision path still works
    }

    const { rawText, method } = await extractDocumentText({
      url: fileUrl,
      kind,
      buffer,
    })

    let extracted = null as ReturnType<typeof parseBodyCompositionJson>
    if (rawText.length >= 40) {
      const jsonRaw = await completeGroqTextChat([
        { role: 'system', content: EXTRACT_JSON_PROMPT },
        {
          role: 'user',
          content: `Extract body composition fields from this OCR text:\n\n${rawText.slice(0, 12000)}`,
        },
      ])
      extracted = parseBodyCompositionJson(jsonRaw)
    }

    // Fallback: vision → JSON directly from preview image
    if (!extracted) {
      const preview = bodyCompositionPreviewUrl(fileUrl, kind)
      const visionJson = await completeGroqVisionChat([
        { role: 'system', content: EXTRACT_JSON_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all body composition metrics from this InBody/BIA report image.',
            },
            { type: 'image_url', image_url: { url: preview } },
          ],
        },
      ])
      extracted = parseBodyCompositionJson(visionJson)
    }

    if (!extracted) {
      return NextResponse.json(
        { error: 'Could not extract metrics from this report. Try a clearer photo or PDF.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      report: extracted,
      rawText,
      method,
    })
  } catch (error) {
    console.error('Body composition analyze failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI analysis failed. Please try again.',
      },
      { status: 503 }
    )
  }
}
