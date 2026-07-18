'use client'

import { Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SpotifyConnectionPublic } from '@/lib/spotify/types'

export function SpotifyConnectCard({
  connection,
  onDisconnect,
  disconnecting,
}: {
  connection: SpotifyConnectionPublic | { connected: false } | null
  onDisconnect?: () => void
  disconnecting?: boolean
}) {
  const connected = connection?.connected === true

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/70 backdrop-blur-md p-5 space-y-4">
      <div className="flex items-start gap-3">
        {connected && connection.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={connection.imageUrl}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center">
            <Music2 className="w-6 h-6 text-[#1DB954]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1DB954]">
            Spotify
          </p>
          {connected ? (
            <>
              <h3 className="text-base font-bold text-foreground truncate">
                {connection.displayName || 'Connected'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(connection.product || 'free').toUpperCase()}
                {connection.country ? ` · ${connection.country}` : ''}
                {connection.email ? ` · ${connection.email}` : ''}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-foreground">Connect Spotify</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Sync playlists and play workout music. Premium unlocks in-app controls.
              </p>
            </>
          )}
        </div>
      </div>

      {connected ? (
        <div className="flex gap-2">
          <a
            href="/spotify"
            className="flex-1 h-11 rounded-[14px] bg-[#1DB954] text-black text-xs font-bold flex items-center justify-center active:scale-[0.98]"
          >
            Open music
          </a>
          <Button
            type="button"
            disabled={disconnecting}
            onClick={onDisconnect}
            className="h-11 px-4 rounded-[14px] bg-muted text-foreground border-0 text-xs font-bold"
          >
            {disconnecting ? '…' : 'Disconnect'}
          </Button>
        </div>
      ) : (
        <a
          href="/api/spotify/auth"
          className="flex h-11 w-full items-center justify-center rounded-[14px] bg-[#1DB954] text-black text-xs font-bold active:scale-[0.98]"
        >
          Connect with Spotify
        </a>
      )}
    </div>
  )
}
