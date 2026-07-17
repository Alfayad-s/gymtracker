import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ensureProfile } from '@/lib/auth/ensure-profile'
import {
  avatarUrlFromAuthUser,
  fullNameFromAuthUser,
  safeAuthNextPath,
} from '@/lib/auth/user-display'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthDescription = searchParams.get('error_description')
  const next = safeAuthNextPath(searchParams.get('next'))

  if (oauthError) {
    const message = encodeURIComponent(
      oauthDescription || oauthError || 'Google sign-in was cancelled'
    )
    return NextResponse.redirect(`${origin}/login?error=oauth&message=${message}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      await ensureProfile({
        id: data.user.id,
        fullName: fullNameFromAuthUser(data.user),
        avatarUrl: avatarUrlFromAuthUser(data.user),
      })

      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('Auth callback exchange failed:', error?.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
