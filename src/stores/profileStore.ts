'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProfileState = {
  fullName: string | null
  avatarUrl: string | null
  experienceLevel: string | null
  /** User height in centimeters */
  heightCm: number | null
  weightUnit: 'kg' | 'lbs'
  setProfile: (profile: {
    fullName?: string | null
    avatarUrl?: string | null
    experienceLevel?: string | null
  }) => void
  setHeightCm: (heightCm: number | null) => void
  setWeightUnit: (unit: 'kg' | 'lbs') => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      fullName: null,
      avatarUrl: null,
      experienceLevel: null,
      heightCm: null,
      weightUnit: 'kg',
      setProfile: (profile) => set((state) => ({ ...state, ...profile })),
      setHeightCm: (heightCm) => set({ heightCm }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
    }),
    { name: 'gymtrack-profile' }
  )
)
