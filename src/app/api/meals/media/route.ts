import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { uploadMealPhoto } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const maxDuration = 60

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to upload a meal photo' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const mealKey = String(form.get('mealKey') ?? `draft-${Date.now().toString(36)}`)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64)

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Photo file is required' }, { status: 400 })
  }

  if (!IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Use a JPG, PNG, WEBP, or GIF image' },
      { status: 400 }
    )
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadMealPhoto({
      userId: user.id,
      mealKey: mealKey || `draft-${Date.now().toString(36)}`,
      buffer,
    })

    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
    })
  } catch (err) {
    console.error('Meal photo upload failed:', err)
    const message =
      err instanceof Error && err.message.includes('Cloudinary is not configured')
        ? err.message
        : 'Failed to upload meal photo'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
