'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SpotifyWorkoutState = {
  selectedPlaylistUri: string | null
  selectedPlaylistName: string | null
  setPlaylist: (uri: string, name: string) => void
  clearPlaylist: () => void
}

export const useSpotifyWorkoutStore = create<SpotifyWorkoutState>()(
  persist(
    (set) => ({
      selectedPlaylistUri: null,
      selectedPlaylistName: null,
      setPlaylist: (uri, name) =>
        set({ selectedPlaylistUri: uri, selectedPlaylistName: name }),
      clearPlaylist: () =>
        set({ selectedPlaylistUri: null, selectedPlaylistName: null }),
    }),
    { name: 'gymtrack-spotify-workout' }
  )
)
