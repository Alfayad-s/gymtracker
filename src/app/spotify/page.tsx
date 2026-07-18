import { Suspense } from 'react'
import SpotifyPage from './spotify-client'

export default function SpotifyRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-10 text-sm text-muted-foreground">Loading Spotify…</div>
      }
    >
      <SpotifyPage />
    </Suspense>
  )
}
