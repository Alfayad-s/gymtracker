import { z } from 'zod'

export const SpotifyProductSchema = z.enum(['premium', 'free', 'open'])
export type SpotifyProduct = z.infer<typeof SpotifyProductSchema>

export const SpotifyConnectionPublicSchema = z.object({
  connected: z.literal(true),
  spotifyUserId: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  country: z.string().nullable(),
  product: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isPremium: z.boolean(),
  tokenExpiresAt: z.string(),
})

export type SpotifyConnectionPublic = z.infer<typeof SpotifyConnectionPublicSchema>

export const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string(),
  durationMs: z.number(),
  artists: z.array(z.object({ id: z.string(), name: z.string() })),
  album: z.object({
    id: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
  }),
  externalUrl: z.string().nullable(),
})

export type SpotifyTrack = z.infer<typeof SpotifyTrackSchema>

export const SpotifyArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  genres: z.array(z.string()),
  externalUrl: z.string().nullable(),
})

export type SpotifyArtist = z.infer<typeof SpotifyArtistSchema>

export const SpotifyPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  trackCount: z.number(),
  uri: z.string(),
  externalUrl: z.string().nullable(),
  ownerName: z.string().nullable(),
})

export type SpotifyPlaylist = z.infer<typeof SpotifyPlaylistSchema>

export const SpotifyDeviceSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  isActive: z.boolean(),
  volumePercent: z.number().nullable(),
})

export type SpotifyDevice = z.infer<typeof SpotifyDeviceSchema>

export const SpotifyPlaybackSchema = z.object({
  isPlaying: z.boolean(),
  progressMs: z.number(),
  shuffle: z.boolean(),
  repeat: z.enum(['off', 'track', 'context']),
  volumePercent: z.number().nullable(),
  device: SpotifyDeviceSchema.nullable(),
  track: SpotifyTrackSchema.nullable(),
})

export type SpotifyPlayback = z.infer<typeof SpotifyPlaybackSchema>

export const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
].join(' ')
