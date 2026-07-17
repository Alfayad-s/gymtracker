'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { ensureProfileClient } from '@/lib/auth/ensure-profile-client'
import { avatarUrlFromAuthUser, fullNameFromAuthUser } from '@/lib/auth/user-display'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const setProfile = useProfileStore((s) => s.setProfile)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const applyUserProfile = async (
      user: NonNullable<
        Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
      >
    ) => {
      const fullName = fullNameFromAuthUser(user)
      const avatarUrl = avatarUrlFromAuthUser(user)

      setProfile({ fullName, avatarUrl })
      await ensureProfileClient({ fullName, avatarUrl })
    }

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      setUser(user)
      setLoading(false)

      if (user) await applyUserProfile(user)
    }

    void syncUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      setUser(user)
      setLoading(false)

      if (user) await applyUserProfile(user)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setLoading, setProfile])

  return <>{children}</>
}
