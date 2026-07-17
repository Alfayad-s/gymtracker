'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BuiltInMuscleGroup } from '@/data/exercises'

export type CustomMuscleGroup = {
  id: string
  name: string
  anatomyBaseGroup: BuiltInMuscleGroup
  createdAt: string
}

type MuscleGroupState = {
  groups: CustomMuscleGroup[]
  createGroup: (name: string, anatomyBaseGroup: BuiltInMuscleGroup) => string
  updateGroup: (
    id: string,
    fields: Pick<CustomMuscleGroup, 'name' | 'anatomyBaseGroup'>
  ) => void
  deleteGroup: (id: string) => void
}

function uid() {
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const useMuscleGroupStore = create<MuscleGroupState>()(
  persist(
    (set) => ({
      groups: [],

      createGroup: (name, anatomyBaseGroup) => {
        const id = uid()
        set((state) => ({
          groups: [
            ...state.groups,
            {
              id,
              name: name.trim(),
              anatomyBaseGroup,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
        return id
      },

      updateGroup: (id, fields) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, ...fields, name: fields.name.trim() } : group
          ),
        })),

      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
        })),
    }),
    { name: 'gymtrack-muscle-groups' }
  )
)
