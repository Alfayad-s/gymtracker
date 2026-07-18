'use client'

import { useTransition } from 'react'
import { ExternalLink, ListMusic, Play } from 'lucide-react'
import { spotifyPlaybackAction } from '@/server/actions/spotify.actions'
import type { SpotifyArtist, SpotifyPlaylist, SpotifyTrack } from '@/lib/spotify/types'

export function SpotifyTrackList({
  title,
  tracks,
  isPremium,
  onPlayed,
}: {
  title: string
  tracks: SpotifyTrack[]
  isPremium: boolean
  onPlayed?: () => void
}) {
  const [pending, startTransition] = useTransition()

  if (!tracks.length) return null

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
        {title}
      </h2>
      <div className="space-y-1.5">
        {tracks.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-[16px] border border-border/50 bg-card/60 px-3 py-2.5"
          >
            {t.album.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.album.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{t.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t.artists.map((a) => a.name).join(', ')}
              </p>
            </div>
            {isPremium ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await spotifyPlaybackAction({ type: 'play', uri: t.uri })
                    onPlayed?.()
                  })
                }
                className="w-9 h-9 rounded-full bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center cursor-pointer disabled:opacity-50"
                aria-label={`Play ${t.name}`}
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            ) : t.externalUrl ? (
              <a
                href={t.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-[#1DB954]"
                aria-label="Open in Spotify"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

export function SpotifyPlaylistGrid({
  playlists,
  isPremium,
  onPlayed,
}: {
  playlists: SpotifyPlaylist[]
  isPremium: boolean
  onPlayed?: () => void
}) {
  const [pending, startTransition] = useTransition()
  if (!playlists.length) return null

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
        Playlists
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {playlists.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending || (!isPremium && !p.externalUrl)}
            onClick={() => {
              if (isPremium) {
                startTransition(async () => {
                  await spotifyPlaybackAction({ type: 'play', uri: p.uri })
                  onPlayed?.()
                })
              } else if (p.externalUrl) {
                window.open(p.externalUrl, '_blank', 'noreferrer')
              }
            }}
            className="rounded-[18px] border border-border/50 bg-card/60 p-3 text-left cursor-pointer active:scale-[0.98] disabled:opacity-50 space-y-2"
          >
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="w-full aspect-square rounded-xl object-cover" />
            ) : (
              <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
                <ListMusic className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {p.trackCount} tracks
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export function SpotifyArtistRow({ artists }: { artists: SpotifyArtist[] }) {
  if (!artists.length) return null
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
        Top artists
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {artists.map((a) => (
          <a
            key={a.id}
            href={a.externalUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 w-24 text-center space-y-1.5"
          >
            {a.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.imageUrl}
                alt=""
                className="w-24 h-24 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted" />
            )}
            <p className="text-[11px] font-bold text-foreground truncate">{a.name}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
