'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { SpotifyConnectCard } from '@/components/spotify/spotify-connect-card'
import { SpotifyPlayer } from '@/components/spotify/spotify-player'
import {
  SpotifyArtistRow,
  SpotifyPlaylistGrid,
  SpotifyTrackList,
} from '@/components/spotify/spotify-library'
import {
  disconnectSpotifyAction,
  getSpotifyLibraryAction,
  type SpotifyLibraryPayload,
} from '@/server/actions/spotify.actions'
import type { SpotifyConnectionPublic } from '@/lib/spotify/types'

export default function SpotifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connection, setConnection] = useState<
    SpotifyConnectionPublic | { connected: false } | null
  >(null)
  const [library, setLibrary] = useState<SpotifyLibraryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Prefer API route in production — clearer errors than digested server actions
      const res = await fetch('/api/spotify/connection', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as
        | SpotifyConnectionPublic
        | { connected: false; error?: string }

      if (!res.ok && 'error' in data && data.error) {
        // Still allow Connect UI when not authorized / table missing
        setConnection({ connected: false })
        if (res.status !== 401) setError(data.error)
        return
      }

      if (data && 'connected' in data && data.connected === false) {
        setConnection({ connected: false })
        setLibrary(null)
        return
      }

      const conn = data as SpotifyConnectionPublic
      setConnection(conn)

      if (conn.connected) {
        try {
          const lib = await getSpotifyLibraryAction()
          setLibrary(lib)
        } catch (libErr) {
          setLibrary(null)
          setError(
            libErr instanceof Error
              ? libErr.message
              : 'Connected, but failed to load Spotify library'
          )
        }
      } else {
        setLibrary(null)
      }
    } catch (err) {
      setConnection({ connected: false })
      const msg = err instanceof Error ? err.message : 'Failed to load Spotify'
      if (!/server components render|digest|omitted in production/i.test(msg)) {
        setError(msg)
      } else {
        setError('Unable to reach Spotify service. Try again or reconnect.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const err = searchParams.get('error')
    const connected = searchParams.get('connected')
    if (err) setError(decodeURIComponent(err))
    if (connected === '1') {
      setError(null)
      void load()
    }
  }, [searchParams, load])

  const refreshPlayback = () => {
    startTransition(async () => {
      try {
        const lib = await getSpotifyLibraryAction()
        setLibrary(lib)
        setConnection(lib.connection)
      } catch {
        /* ignore */
      }
    })
  }

  return (
    <div className="px-5 pt-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spotify-logo.png"
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
            Spotify
          </h1>
          <p className="text-[11px] text-muted-foreground">Workout soundtrack</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <SpotifyConnectCard
            connection={connection}
            disconnecting={pending}
            onDisconnect={() =>
              startTransition(async () => {
                await disconnectSpotifyAction()
                setConnection({ connected: false })
                setLibrary(null)
              })
            }
          />

          {library && (
            <>
              <SpotifyPlayer
                isPremium={library.connection.isPremium}
                initialPlayback={library.playback}
                initialDevices={library.devices}
              />

              <SpotifyPlaylistGrid
                playlists={library.playlists}
                isPremium={library.connection.isPremium}
                onPlayed={refreshPlayback}
              />

              <SpotifyTrackList
                title="Recently played"
                tracks={library.recentlyPlayed}
                isPremium={library.connection.isPremium}
                onPlayed={refreshPlayback}
              />

              <SpotifyTrackList
                title="Top tracks"
                tracks={library.topTracks}
                isPremium={library.connection.isPremium}
                onPlayed={refreshPlayback}
              />

              <SpotifyArtistRow artists={library.topArtists} />
            </>
          )}
        </>
      )}
    </div>
  )
}
