'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { ensureProfile } from '@/lib/auth/ensure-profile'
import {
  deleteConnection,
  getConnectionRow,
  getDevices,
  getPlaybackState,
  getRecentlyPlayed,
  getTopArtists,
  getTopTracks,
  getUserPlaylists,
  playbackAction,
  rowToPublic,
} from '@/lib/spotify/client'
import type {
  SpotifyArtist,
  SpotifyConnectionPublic,
  SpotifyDevice,
  SpotifyPlayback,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/lib/spotify/types'

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
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
  return user.id
}

export async function getSpotifyConnectionAction(): Promise<
  SpotifyConnectionPublic | { connected: false }
> {
  const userId = await requireUserId()
  const row = await getConnectionRow(userId)
  if (!row) return { connected: false }
  return rowToPublic(row)
}

export async function disconnectSpotifyAction(): Promise<{ ok: true }> {
  const userId = await requireUserId()
  await deleteConnection(userId)
  revalidatePath('/spotify')
  revalidatePath('/settings')
  revalidatePath('/workout')
  return { ok: true }
}

export type SpotifyLibraryPayload = {
  connection: SpotifyConnectionPublic
  recentlyPlayed: SpotifyTrack[]
  playlists: SpotifyPlaylist[]
  topArtists: SpotifyArtist[]
  topTracks: SpotifyTrack[]
  playback: SpotifyPlayback | null
  devices: SpotifyDevice[]
}

export async function getSpotifyLibraryAction(): Promise<SpotifyLibraryPayload> {
  const userId = await requireUserId()
  const row = await getConnectionRow(userId)
  if (!row) throw new Error('Spotify is not connected')

  const connection = rowToPublic(row)
  const [recentlyPlayed, playlists, topArtists, topTracks, playback, devices] =
    await Promise.all([
      getRecentlyPlayed(userId).catch(() => []),
      getUserPlaylists(userId).catch(() => []),
      getTopArtists(userId).catch(() => []),
      getTopTracks(userId).catch(() => []),
      getPlaybackState(userId).catch(() => null),
      getDevices(userId).catch(() => []),
    ])

  return {
    connection,
    recentlyPlayed,
    playlists,
    topArtists,
    topTracks,
    playback,
    devices,
  }
}

export async function getSpotifyPlaybackAction(): Promise<SpotifyPlayback | null> {
  const userId = await requireUserId()
  return getPlaybackState(userId)
}

export async function getSpotifyDevicesAction(): Promise<SpotifyDevice[]> {
  const userId = await requireUserId()
  return getDevices(userId)
}

const PlaybackInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('play'),
    uri: z.string().optional(),
    deviceId: z.string().optional(),
    positionMs: z.number().int().min(0).optional(),
  }),
  z.object({ type: z.literal('pause'), deviceId: z.string().optional() }),
  z.object({ type: z.literal('next'), deviceId: z.string().optional() }),
  z.object({ type: z.literal('previous'), deviceId: z.string().optional() }),
  z.object({
    type: z.literal('seek'),
    positionMs: z.number().int().min(0),
    deviceId: z.string().optional(),
  }),
  z.object({
    type: z.literal('volume'),
    volumePercent: z.number().min(0).max(100),
    deviceId: z.string().optional(),
  }),
  z.object({
    type: z.literal('shuffle'),
    state: z.boolean(),
    deviceId: z.string().optional(),
  }),
  z.object({
    type: z.literal('repeat'),
    state: z.enum(['off', 'track', 'context']),
    deviceId: z.string().optional(),
  }),
  z.object({
    type: z.literal('transfer'),
    deviceId: z.string().min(1),
    play: z.boolean().optional(),
  }),
])

export async function spotifyPlaybackAction(
  input: z.input<typeof PlaybackInputSchema>
): Promise<{ ok: true }> {
  const userId = await requireUserId()
  const parsed = PlaybackInputSchema.parse(input)
  await playbackAction(userId, parsed)
  return { ok: true }
}
