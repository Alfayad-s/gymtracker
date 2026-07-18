'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Music2 } from 'lucide-react'
import type { SpotifyConnectionPublic } from '@/lib/spotify/types'

/** Settings / widgets — loads via API to avoid digested server-action errors. */
export function SpotifySettingsRow() {
  const [spotify, setSpotify] = useState<
    SpotifyConnectionPublic | { connected: false } | null
  >(null)

  useEffect(() => {
    void fetch('/api/spotify/connection', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: SpotifyConnectionPublic | { connected: false }) => setSpotify(data))
      .catch(() => setSpotify({ connected: false }))
  }, [])

  const connected = spotify?.connected === true

  return (
    <div className="bg-card border border-border rounded-[24px] p-5 flex justify-between items-center gap-3">
      <div className="space-y-0.5 min-w-0">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Music2 className="w-4 h-4 text-[#1DB954]" />
          Spotify
        </span>
        <p className="text-[10px] text-muted-foreground truncate">
          {connected
            ? `Connected as ${spotify.displayName || 'Spotify user'} · ${(spotify.product || 'free').toUpperCase()}`
            : 'Connect for workout playlists & player'}
        </p>
      </div>
      {connected ? (
        <Link
          href="/spotify"
          className="h-9 px-3 rounded-full bg-[#1DB954] text-black text-xs font-bold flex items-center shrink-0 active:scale-95"
        >
          Open
        </Link>
      ) : (
        <a
          href="/api/spotify/auth"
          className="h-9 px-3 rounded-full bg-[#1DB954] text-black text-xs font-bold flex items-center shrink-0 active:scale-95"
        >
          Connect
        </a>
      )}
    </div>
  )
}
