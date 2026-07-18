'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import {
  getSpotifyDevicesAction,
  getSpotifyPlaybackAction,
  spotifyPlaybackAction,
} from '@/server/actions/spotify.actions'
import type { SpotifyDevice, SpotifyPlayback } from '@/lib/spotify/types'
import { cn } from '@/lib/utils'
import { useSpotifyWebPlayer } from '@/hooks/useSpotifyWebPlayer'

function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SpotifyPlayer({
  isPremium,
  initialPlayback,
  initialDevices,
  webPlayerDeviceId,
}: {
  isPremium: boolean
  initialPlayback: SpotifyPlayback | null
  initialDevices: SpotifyDevice[]
  webPlayerDeviceId?: string | null
}) {
  const [playback, setPlayback] = useState(initialPlayback)
  const [devices, setDevices] = useState(initialDevices)
  const [pending, startTransition] = useTransition()
  const [localProgress, setLocalProgress] = useState(initialPlayback?.progressMs ?? 0)
  const [error, setError] = useState<string | null>(null)

  const { deviceId: sdkDeviceId, ready: sdkReady, error: sdkError } =
    useSpotifyWebPlayer(isPremium)

  const activeDeviceId =
    webPlayerDeviceId ||
    sdkDeviceId ||
    playback?.device?.id ||
    devices.find((d) => d.isActive)?.id ||
    undefined

  useEffect(() => {
    if (!isPremium || !sdkReady || !sdkDeviceId) return
    startTransition(async () => {
      try {
        await spotifyPlaybackAction({
          type: 'transfer',
          deviceId: sdkDeviceId,
          play: false,
        })
        const next = await getSpotifyPlaybackAction()
        setPlayback(next)
        setDevices(await getSpotifyDevicesAction())
      } catch {
        /* device may already be active */
      }
    })
  }, [isPremium, sdkReady, sdkDeviceId])

  useEffect(() => {
    setLocalProgress(playback?.progressMs ?? 0)
  }, [playback?.track?.id, playback?.progressMs, playback?.isPlaying])

  useEffect(() => {
    if (!playback?.isPlaying) return
    const id = window.setInterval(() => {
      setLocalProgress((p) => p + 1000)
    }, 1000)
    return () => window.clearInterval(id)
  }, [playback?.isPlaying])

  const duration = playback?.track?.durationMs ?? 0
  const pct = duration ? Math.min(100, (localProgress / duration) * 100) : 0

  const refresh = () => {
    startTransition(async () => {
      try {
        const [p, d] = await Promise.all([
          getSpotifyPlaybackAction(),
          getSpotifyDevicesAction(),
        ])
        setPlayback(p)
        setDevices(d)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Playback sync failed')
      }
    })
  }

  const run = (action: Parameters<typeof spotifyPlaybackAction>[0]) => {
    startTransition(async () => {
      try {
        const withDevice =
          'deviceId' in action && action.deviceId
            ? action
            : activeDeviceId
              ? ({ ...action, deviceId: activeDeviceId } as typeof action)
              : action
        await spotifyPlaybackAction(withDevice)
        await new Promise((r) => setTimeout(r, 250))
        const p = await getSpotifyPlaybackAction()
        setPlayback(p)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const openUrl = useMemo(() => {
    return (
      playback?.track?.externalUrl ||
      'https://open.spotify.com'
    )
  }, [playback?.track?.externalUrl])

  if (!isPremium) {
    return (
      <div className="rounded-[24px] border border-border/60 bg-card/70 backdrop-blur-md p-5 space-y-4">
        <TrackHeader playback={playback} />
        <p className="text-xs text-muted-foreground leading-relaxed">
          In-app playback needs Spotify Premium. You can still browse and open tracks in the
          Spotify app.
        </p>
        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1DB954] text-black text-xs font-bold"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Spotify
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-border/60 bg-card/70 backdrop-blur-md p-5 space-y-4">
      <TrackHeader playback={playback} />

      {(error || sdkError) && (
        <p className="text-xs text-destructive">{error || sdkError}</p>
      )}

      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={Math.min(localProgress, duration || 0)}
          disabled={pending || !playback?.track}
          onChange={(e) => setLocalProgress(Number(e.target.value))}
          onMouseUp={(e) =>
            run({ type: 'seek', positionMs: Number((e.target as HTMLInputElement).value) })
          }
          onTouchEnd={(e) =>
            run({
              type: 'seek',
              positionMs: Number((e.target as HTMLInputElement).value),
            })
          }
          className="w-full accent-[#1DB954]"
        />
        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground tabular-nums">
          <span>{formatMs(localProgress)}</span>
          <span>{formatMs(duration)}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-[#1DB954]"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <IconBtn
          active={playback?.shuffle}
          onClick={() => run({ type: 'shuffle', state: !playback?.shuffle })}
          label="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </IconBtn>
        <IconBtn onClick={() => run({ type: 'previous' })} label="Previous">
          <SkipBack className="w-5 h-5" />
        </IconBtn>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run({ type: playback?.isPlaying ? 'pause' : 'play' })
          }
          className="w-14 h-14 rounded-full bg-[#1DB954] text-black flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
          aria-label={playback?.isPlaying ? 'Pause' : 'Play'}
        >
          {playback?.isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>
        <IconBtn onClick={() => run({ type: 'next' })} label="Next">
          <SkipForward className="w-5 h-5" />
        </IconBtn>
        <IconBtn
          active={playback?.repeat !== 'off'}
          onClick={() => {
            const next =
              playback?.repeat === 'off'
                ? 'context'
                : playback?.repeat === 'context'
                  ? 'track'
                  : 'off'
            run({ type: 'repeat', state: next })
          }}
          label="Repeat"
        >
          <Repeat className="w-4 h-4" />
        </IconBtn>
      </div>

      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="range"
          min={0}
          max={100}
          value={playback?.volumePercent ?? 80}
          disabled={pending}
          onChange={(e) => {
            const v = Number(e.target.value)
            setPlayback((p) => (p ? { ...p, volumePercent: v } : p))
          }}
          onMouseUp={(e) =>
            run({
              type: 'volume',
              volumePercent: Number((e.target as HTMLInputElement).value),
            })
          }
          onTouchEnd={(e) =>
            run({
              type: 'volume',
              volumePercent: Number((e.target as HTMLInputElement).value),
            })
          }
          className="flex-1 accent-[#1DB954]"
        />
      </div>

      {devices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Device
          </p>
          <select
            className="w-full h-11 rounded-[14px] bg-muted border border-border px-3 text-sm text-foreground"
            value={activeDeviceId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              if (!id) return
              run({ type: 'transfer', deviceId: id, play: playback?.isPlaying })
            }}
          >
            {devices.map((d) => (
              <option key={d.id ?? d.name} value={d.id ?? ''}>
                {d.name} ({d.type}){d.isActive ? ' · active' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={refresh}
        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
      >
        Refresh playback
      </button>
    </div>
  )
}

function TrackHeader({ playback }: { playback: SpotifyPlayback | null }) {
  const track = playback?.track
  return (
    <div className="flex items-center gap-3">
      {track?.album.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.album.imageUrl}
          alt=""
          className="w-16 h-16 rounded-2xl object-cover border border-border shadow-lg"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Play className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground truncate">
          {track?.name ?? 'Nothing playing'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {track?.artists.map((a) => a.name).join(', ') || 'Select a playlist or track'}
        </p>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'p-2.5 rounded-xl cursor-pointer active:scale-95 transition-colors',
        active ? 'text-[#1DB954] bg-[#1DB954]/15' : 'text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
