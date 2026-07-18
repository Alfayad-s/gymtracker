import { createHash, randomBytes } from 'crypto'

const VERIFIER_COOKIE = 'spotify_pkce_verifier'
const STATE_COOKIE = 'spotify_oauth_state'

export { VERIFIER_COOKIE, STATE_COOKIE }

export function getSpotifyClientId(): string {
  const id =
    process.env.SPOTIFY_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.trim()
  if (!id) throw new Error('SPOTIFY_CLIENT_ID is not configured')
  return id
}

export function getSpotifyRedirectUri(): string {
  const explicit = process.env.SPOTIFY_REDIRECT_URI?.trim()
  if (explicit) return explicit
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (base) {
    const origin = base.startsWith('http') ? base : `https://${base}`
    return `${origin.replace(/\/$/, '')}/api/spotify/callback`
  }
  return 'http://127.0.0.1:3000/api/spotify/callback'
}

/** PKCE code verifier (43–128 chars). */
export function createCodeVerifier(): string {
  return base64Url(randomBytes(64))
}

export function createCodeChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest())
}

export function createOAuthState(): string {
  return base64Url(randomBytes(24))
}

function base64Url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  scopes: string
  state: string
  codeChallenge: string
}): string {
  const q = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    scope: params.scopes,
    state: params.state,
    code_challenge_method: 'S256',
    code_challenge: params.codeChallenge,
  })
  return `https://accounts.spotify.com/authorize?${q.toString()}`
}
