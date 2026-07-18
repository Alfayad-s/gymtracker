import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { spotifyConnections } from '@/db/schema'
import { getSpotifyClientId, getSpotifyRedirectUri } from './pkce'
import type {
  SpotifyArtist,
  SpotifyConnectionPublic,
  SpotifyDevice,
  SpotifyPlayback,
  SpotifyPlaylist,
  SpotifyTrack,
} from './types'

type TokenResponse = {
  access_token: string
  token_type: string
  scope?: string
  expires_in: number
  refresh_token?: string
}

type ConnectionRow = typeof spotifyConnections.$inferSelect

function mapTrack(raw: Record<string, unknown> | null | undefined): SpotifyTrack | null {
  if (!raw || typeof raw.id !== 'string') return null
  const artists = Array.isArray(raw.artists)
    ? (raw.artists as Array<{ id?: string; name?: string }>).map((a) => ({
        id: a.id ?? '',
        name: a.name ?? 'Unknown',
      }))
    : []
  const album = (raw.album as Record<string, unknown> | undefined) ?? {}
  const images = Array.isArray(album.images)
    ? (album.images as Array<{ url?: string }>)
    : []
  const external = (raw.external_urls as { spotify?: string } | undefined)?.spotify ?? null

  return {
    id: raw.id,
    name: String(raw.name ?? 'Unknown'),
    uri: String(raw.uri ?? `spotify:track:${raw.id}`),
    durationMs: Number(raw.duration_ms) || 0,
    artists,
    album: {
      id: String(album.id ?? ''),
      name: String(album.name ?? ''),
      imageUrl: images[0]?.url ?? null,
    },
    externalUrl: external,
  }
}

export function rowToPublic(row: ConnectionRow): SpotifyConnectionPublic {
  const product = (row.product ?? '').toLowerCase()
  return {
    connected: true,
    spotifyUserId: row.spotifyUserId,
    displayName: row.displayName,
    email: row.email,
    country: row.country,
    product: row.product,
    imageUrl: row.imageUrl,
    isPremium: product === 'premium',
    tokenExpiresAt: row.tokenExpiresAt.toISOString(),
  }
}

export async function getConnectionRow(userId: string): Promise<ConnectionRow | null> {
  return (
    (await db.query.spotifyConnections.findFirst({
      where: eq(spotifyConnections.userId, userId),
    })) ?? null
  )
}

async function exchangeToken(body: URLSearchParams): Promise<TokenResponse> {
  const clientId = getSpotifyClientId()
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim()

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  } else {
    body.set('client_id', clientId)
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers,
    body,
  })
  const data = (await res.json().catch(() => ({}))) as TokenResponse & {
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Spotify token exchange failed')
  }
  return data
}

export async function exchangeAuthorizationCode(params: {
  code: string
  codeVerifier: string
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: getSpotifyRedirectUri(),
    code_verifier: params.codeVerifier,
  })
  return exchangeToken(body)
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  return exchangeToken(body)
}

export async function upsertConnection(params: {
  userId: string
  tokens: TokenResponse
  profile: {
    id: string
    display_name?: string | null
    email?: string | null
    country?: string | null
    product?: string | null
    images?: Array<{ url?: string }>
  }
}): Promise<ConnectionRow> {
  const expiresAt = new Date(Date.now() + params.tokens.expires_in * 1000 - 60_000)
  const imageUrl = params.profile.images?.[0]?.url ?? null
  const values = {
    userId: params.userId,
    spotifyUserId: params.profile.id,
    displayName: params.profile.display_name ?? null,
    email: params.profile.email ?? null,
    country: params.profile.country ?? null,
    product: params.profile.product ?? null,
    imageUrl,
    accessToken: params.tokens.access_token,
    refreshToken: params.tokens.refresh_token ?? '',
    tokenExpiresAt: expiresAt,
    scope: params.tokens.scope ?? null,
  }

  const existing = await getConnectionRow(params.userId)
  if (existing) {
    const [updated] = await db
      .update(spotifyConnections)
      .set({
        ...values,
        refreshToken: params.tokens.refresh_token || existing.refreshToken,
      })
      .where(eq(spotifyConnections.userId, params.userId))
      .returning()
    return updated
  }

  const [inserted] = await db.insert(spotifyConnections).values(values).returning()
  return inserted
}

export async function deleteConnection(userId: string): Promise<void> {
  await db.delete(spotifyConnections).where(eq(spotifyConnections.userId, userId))
}

/** Returns a valid access token, refreshing if needed. */
export async function getValidAccessToken(userId: string): Promise<string> {
  const row = await getConnectionRow(userId)
  if (!row) throw new Error('Spotify is not connected')

  if (row.tokenExpiresAt.getTime() > Date.now() + 30_000) {
    return row.accessToken
  }

  if (!row.refreshToken) throw new Error('Spotify session expired — reconnect')

  const tokens = await refreshAccessToken(row.refreshToken)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000 - 60_000)
  await db
    .update(spotifyConnections)
    .set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || row.refreshToken,
      tokenExpiresAt: expiresAt,
      scope: tokens.scope ?? row.scope,
    })
    .where(eq(spotifyConnections.userId, userId))

  return tokens.access_token
}

async function spotifyFetch<T>(
  userId: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getValidAccessToken(userId)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers,
  })

  if (res.status === 204 || res.status === 202) return null as T

  const text = await res.text()
  if (!text) {
    if (!res.ok) throw new Error(`Spotify API error (${res.status})`)
    return null as T
  }

  const data = JSON.parse(text) as T & {
    error?: { message?: string; status?: number }
  }

  if (!res.ok) {
    const msg = data?.error?.message || `Spotify API error (${res.status})`
    throw new Error(msg)
  }
  return data
}

export async function fetchSpotifyProfile(accessToken: string) {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    display_name?: string
    email?: string
    country?: string
    product?: string
    images?: Array<{ url?: string }>
    error?: { message?: string }
  }
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Failed to load Spotify profile')
  }
  return data as {
    id: string
    display_name?: string | null
    email?: string | null
    country?: string | null
    product?: string | null
    images?: Array<{ url?: string }>
  }
}

export async function getRecentlyPlayed(userId: string, limit = 20): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{
    items?: Array<{ track?: Record<string, unknown> }>
  }>(userId, `/me/player/recently-played?limit=${limit}`)
  return (data?.items ?? [])
    .map((i) => mapTrack(i.track))
    .filter((t): t is SpotifyTrack => Boolean(t))
}

export async function getUserPlaylists(userId: string, limit = 30): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch<{
    items?: Array<Record<string, unknown>>
  }>(userId, `/me/playlists?limit=${limit}`)

  return (data?.items ?? []).map((p) => {
    const images = Array.isArray(p.images) ? (p.images as Array<{ url?: string }>) : []
    const tracks = (p.tracks as { total?: number } | undefined)?.total ?? 0
    const owner = p.owner as { display_name?: string } | undefined
    return {
      id: String(p.id),
      name: String(p.name ?? 'Playlist'),
      description: typeof p.description === 'string' ? p.description : null,
      imageUrl: images[0]?.url ?? null,
      trackCount: tracks,
      uri: String(p.uri ?? `spotify:playlist:${p.id}`),
      externalUrl: (p.external_urls as { spotify?: string } | undefined)?.spotify ?? null,
      ownerName: owner?.display_name ?? null,
    }
  })
}

export async function getTopArtists(
  userId: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<{ items?: Array<Record<string, unknown>> }>(
    userId,
    `/me/top/artists?limit=20&time_range=${timeRange}`
  )
  return (data?.items ?? []).map((a) => {
    const images = Array.isArray(a.images) ? (a.images as Array<{ url?: string }>) : []
    return {
      id: String(a.id),
      name: String(a.name ?? 'Artist'),
      imageUrl: images[0]?.url ?? null,
      genres: Array.isArray(a.genres) ? (a.genres as string[]) : [],
      externalUrl: (a.external_urls as { spotify?: string } | undefined)?.spotify ?? null,
    }
  })
}

export async function getTopTracks(
  userId: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items?: Array<Record<string, unknown>> }>(
    userId,
    `/me/top/tracks?limit=20&time_range=${timeRange}`
  )
  return (data?.items ?? [])
    .map((t) => mapTrack(t))
    .filter((t): t is SpotifyTrack => Boolean(t))
}

export async function getPlaybackState(userId: string): Promise<SpotifyPlayback | null> {
  const data = await spotifyFetch<Record<string, unknown> | null>(userId, '/me/player')
  if (!data) return null

  const device = data.device as Record<string, unknown> | undefined
  const item = data.item as Record<string, unknown> | undefined
  const repeatState = String(data.repeat_state ?? 'off')

  return {
    isPlaying: Boolean(data.is_playing),
    progressMs: Number(data.progress_ms) || 0,
    shuffle: Boolean(data.shuffle_state),
    repeat:
      repeatState === 'track' || repeatState === 'context' ? repeatState : 'off',
    volumePercent:
      device?.volume_percent != null ? Number(device.volume_percent) : null,
    device: device
      ? {
          id: typeof device.id === 'string' ? device.id : null,
          name: String(device.name ?? 'Device'),
          type: String(device.type ?? 'unknown'),
          isActive: Boolean(device.is_active),
          volumePercent:
            device.volume_percent != null ? Number(device.volume_percent) : null,
        }
      : null,
    track: mapTrack(item),
  }
}

export async function getDevices(userId: string): Promise<SpotifyDevice[]> {
  const data = await spotifyFetch<{ devices?: Array<Record<string, unknown>> }>(
    userId,
    '/me/player/devices'
  )
  return (data?.devices ?? []).map((d) => ({
    id: typeof d.id === 'string' ? d.id : null,
    name: String(d.name ?? 'Device'),
    type: String(d.type ?? 'unknown'),
    isActive: Boolean(d.is_active),
    volumePercent: d.volume_percent != null ? Number(d.volume_percent) : null,
  }))
}

export async function playbackAction(
  userId: string,
  action:
    | { type: 'play'; uri?: string; deviceId?: string; positionMs?: number }
    | { type: 'pause'; deviceId?: string }
    | { type: 'next'; deviceId?: string }
    | { type: 'previous'; deviceId?: string }
    | { type: 'seek'; positionMs: number; deviceId?: string }
    | { type: 'volume'; volumePercent: number; deviceId?: string }
    | { type: 'shuffle'; state: boolean; deviceId?: string }
    | { type: 'repeat'; state: 'off' | 'track' | 'context'; deviceId?: string }
    | { type: 'transfer'; deviceId: string; play?: boolean }
): Promise<void> {
  const q = (deviceId?: string) =>
    deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''

  switch (action.type) {
    case 'play': {
      const body: Record<string, unknown> = {}
      if (action.uri) {
        if (action.uri.includes('playlist') || action.uri.includes('album')) {
          body.context_uri = action.uri
        } else {
          body.uris = [action.uri]
        }
      }
      if (action.positionMs != null) body.position_ms = action.positionMs
      await spotifyFetch(userId, `/me/player/play${q(action.deviceId)}`, {
        method: 'PUT',
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      })
      break
    }
    case 'pause':
      await spotifyFetch(userId, `/me/player/pause${q(action.deviceId)}`, {
        method: 'PUT',
      })
      break
    case 'next':
      await spotifyFetch(userId, `/me/player/next${q(action.deviceId)}`, {
        method: 'POST',
      })
      break
    case 'previous':
      await spotifyFetch(userId, `/me/player/previous${q(action.deviceId)}`, {
        method: 'POST',
      })
      break
    case 'seek':
      await spotifyFetch(
        userId,
        `/me/player/seek?position_ms=${action.positionMs}${
          action.deviceId ? `&device_id=${encodeURIComponent(action.deviceId)}` : ''
        }`,
        { method: 'PUT' }
      )
      break
    case 'volume':
      await spotifyFetch(
        userId,
        `/me/player/volume?volume_percent=${Math.round(action.volumePercent)}${
          action.deviceId ? `&device_id=${encodeURIComponent(action.deviceId)}` : ''
        }`,
        { method: 'PUT' }
      )
      break
    case 'shuffle':
      await spotifyFetch(
        userId,
        `/me/player/shuffle?state=${action.state}${
          action.deviceId ? `&device_id=${encodeURIComponent(action.deviceId)}` : ''
        }`,
        { method: 'PUT' }
      )
      break
    case 'repeat':
      await spotifyFetch(
        userId,
        `/me/player/repeat?state=${action.state}${
          action.deviceId ? `&device_id=${encodeURIComponent(action.deviceId)}` : ''
        }`,
        { method: 'PUT' }
      )
      break
    case 'transfer':
      await spotifyFetch(userId, '/me/player', {
        method: 'PUT',
        body: JSON.stringify({
          device_ids: [action.deviceId],
          play: action.play ?? true,
        }),
      })
      break
  }
}
