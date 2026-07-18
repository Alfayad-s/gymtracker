'use client'

import { useEffect, useState, useTransition } from 'react'
import { ListMusic, Check } from 'lucide-react'
import {
  getSpotifyConnectionAction,
  getSpotifyLibraryAction,
  spotifyPlaybackAction,
} from '@/server/actions/spotify.actions'
import { useSpotifyWorkoutStore } from '@/stores/spotifyWorkoutStore'
import type { SpotifyPlaylist } from '@/lib/spotify/types'
import { cn } from '@/lib/utils'

/** Compact playlist picker for pre-workout selection. */
export function WorkoutPlaylistPicker({ className }: { className?: string }) {
  const selectedUri = useSpotifyWorkoutStore((s) => s.selectedPlaylistUri)
  const selectedName = useSpotifyWorkoutStore((s) => s.selectedPlaylistName)
  const setPlaylist = useSpotifyWorkoutStore((s) => s.setPlaylist)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [open, setOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    void (async () => {
      try {
        const conn = await getSpotifyConnectionAction()
        if (!conn.connected) {
          setConnected(false)
          return
        }
        setConnected(true)
        setIsPremium(conn.isPremium)
        const lib = await getSpotifyLibraryAction()
        setPlaylists(lib.playlists.slice(0, 12))
      } catch {
        setConnected(false)
      }
    })()
  }, [])

  if (!connected) {
    return (
      <a
        href="/spotify"
        className={cn(
          'flex items-center gap-2 rounded-[16px] border border-[#1DB954]/25 bg-[#1DB954]/10 px-3 py-2.5 text-xs font-semibold text-foreground',
          className
        )}
      >
        <ListMusic className="w-4 h-4 text-[#1DB954]" />
        Choose workout playlist
      </a>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-[16px] border border-border/60 bg-card/70 px-3 py-2.5 text-left cursor-pointer active:scale-[0.99]"
      >
        <ListMusic className="w-4 h-4 text-[#1DB954] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Workout playlist
          </p>
          <p className="text-xs font-bold text-foreground truncate">
            {selectedName || 'Tap to choose'}
          </p>
        </div>
        {selectedUri && isPremium && (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation()
              startTransition(async () => {
                await spotifyPlaybackAction({ type: 'play', uri: selectedUri })
              })
            }}
            className="h-8 px-2.5 rounded-full bg-[#1DB954] text-black text-[10px] font-bold cursor-pointer disabled:opacity-50"
          >
            Play
          </button>
        )}
      </button>

      {open && (
        <div className="rounded-[16px] border border-border/60 bg-card max-h-48 overflow-y-auto divide-y divide-border/40">
          {playlists.map((p) => {
            const active = p.uri === selectedUri
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlaylist(p.uri, p.name)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 cursor-pointer"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-muted" />
                )}
                <span className="text-xs font-semibold text-foreground truncate flex-1">
                  {p.name}
                </span>
                {active && <Check className="w-3.5 h-3.5 text-[#1DB954]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
