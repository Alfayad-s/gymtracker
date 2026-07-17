import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { uploadProfileAvatar } from '@/lib/cloudinary'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Use a JPG, PNG, WEBP, or GIF image' },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`
    const uploaded = await uploadProfileAvatar({
      userId: user.id,
      dataUri,
    })

    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: uploaded.url,
      },
    })

    if (updateError) {
      console.error('Failed to update auth avatar:', updateError)
    }

    try {
      await db
        .update(profiles)
        .set({ avatarUrl: uploaded.url })
        .where(eq(profiles.id, user.id))
    } catch (err) {
      console.error('Failed to update profiles.avatar_url:', err)
    }

    return NextResponse.json({
      url: uploaded.url,
      user: updatedUser.user,
    })
  } catch (err) {
    console.error('Avatar upload failed:', err)
    const message =
      err instanceof Error && err.message.includes('Cloudinary is not configured')
        ? err.message
        : 'Failed to upload image'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
