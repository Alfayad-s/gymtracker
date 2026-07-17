/** Shared helpers for auth user display fields (email + OAuth providers). */

type AuthMetadata = Record<string, unknown> | undefined | null

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function fullNameFromAuthUser(user: {
  email?: string | null
  user_metadata?: AuthMetadata
}): string | null {
  const meta = user.user_metadata ?? {}
  return (
    asString(meta.full_name) ||
    asString(meta.name) ||
    asString(meta.given_name) ||
    (user.email ? user.email.split('@')[0] : null)
  )
}

/** Google often sends `picture`; Supabase may also map it to `avatar_url`. */
export function avatarUrlFromAuthUser(user: {
  user_metadata?: AuthMetadata
}): string | null {
  const meta = user.user_metadata ?? {}
  return asString(meta.avatar_url) || asString(meta.picture) || null
}

/** Only allow same-origin relative paths for post-login redirects. */
export function safeAuthNextPath(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    return fallback
  }
  return next
}
