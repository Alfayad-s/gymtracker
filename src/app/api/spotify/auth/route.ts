import { NextResponse, type NextRequest } from 'next/server'
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

function originFrom(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (proto && host) return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`
  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const origin = originFrom(request)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  try {
    const clientId = getSpotifyClientId()
    const redirectUri = getSpotifyRedirectUri(origin)
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

    // Debug aid — check Network tab / logs if Spotify rejects redirect_uri
    console.info('[spotify/auth] redirect_uri=', redirectUri)

    const res = NextResponse.redirect(url)
    const cookieOpts = {
      httpOnly: true,
      secure: origin.startsWith('https'),
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 10,
    }
    res.cookies.set(VERIFIER_COOKIE, verifier, cookieOpts)
    res.cookies.set(STATE_COOKIE, state, cookieOpts)
    // Remember which redirect_uri we used for the token exchange
    res.cookies.set('spotify_redirect_uri', redirectUri, cookieOpts)
    return res
  } catch (error) {
    console.error('Spotify auth start failed:', error)
    return NextResponse.redirect(
      `${origin}/spotify?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Spotify auth failed'
      )}`
    )
  }
}
