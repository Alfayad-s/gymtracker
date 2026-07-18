import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  STATE_COOKIE,
  VERIFIER_COOKIE,
  buildAuthorizeUrl,
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  getSpotifyClientId,
  getSpotifyRedirectUri,
} from '@/lib/spotify/pkce'
import { SPOTIFY_SCOPES } from '@/lib/spotify/types'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'))
  }

  try {
    const clientId = getSpotifyClientId()
    const redirectUri = getSpotifyRedirectUri()
    const verifier = createCodeVerifier()
    const challenge = createCodeChallenge(verifier)
    const state = createOAuthState()

    const url = buildAuthorizeUrl({
      clientId,
      redirectUri,
      scopes: SPOTIFY_SCOPES,
      state,
      codeChallenge: challenge,
    })

    const res = NextResponse.redirect(url)
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 10,
    }
    res.cookies.set(VERIFIER_COOKIE, verifier, cookieOpts)
    res.cookies.set(STATE_COOKIE, state, cookieOpts)
    return res
  } catch (error) {
    console.error('Spotify auth start failed:', error)
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
    return NextResponse.redirect(
      `${origin}/spotify?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Spotify auth failed'
      )}`
    )
  }
}
