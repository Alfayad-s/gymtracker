import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ensureProfile } from '@/lib/auth/ensure-profile'
import {
  STATE_COOKIE,
  VERIFIER_COOKIE,
  getSpotifyRedirectUri,
} from '@/lib/spotify/pkce'
import {
  exchangeAuthorizationCode,
  fetchSpotifyProfile,
  upsertConnection,
} from '@/lib/spotify/client'

export const runtime = 'nodejs'

function originFrom(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (proto && host) return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    request.nextUrl.origin
  )
}

export async function GET(request: NextRequest) {
  const origin = originFrom(request)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${origin}/spotify?error=${encodeURIComponent(error)}`
    )
  }

  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value
  const expectedState = request.cookies.get(STATE_COOKIE)?.value
  const redirectUri =
    request.cookies.get('spotify_redirect_uri')?.value ||
    getSpotifyRedirectUri(origin)

  if (!code || !verifier || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      `${origin}/spotify?error=${encodeURIComponent('Invalid OAuth state')}`
    )
  }

  try {
    await ensureProfile({
      id: user.id,
      fullName:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        null,
      avatarUrl:
        (user.user_metadata?.avatar_url as string | undefined) ||
        (user.user_metadata?.picture as string | undefined) ||
        null,
    })

    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: verifier,
      redirectUri,
    })
    const profile = await fetchSpotifyProfile(tokens.access_token)
    await upsertConnection({
      userId: user.id,
      tokens: {
        ...tokens,
        refresh_token: tokens.refresh_token,
      },
      profile,
    })

    const res = NextResponse.redirect(`${origin}/spotify?connected=1`)
    res.cookies.set(VERIFIER_COOKIE, '', { path: '/', maxAge: 0 })
    res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
    res.cookies.set('spotify_redirect_uri', '', { path: '/', maxAge: 0 })
    return res
  } catch (err) {
    console.error('Spotify callback failed:', err)
    return NextResponse.redirect(
      `${origin}/spotify?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'Connection failed'
      )}`
    )
  }
}
