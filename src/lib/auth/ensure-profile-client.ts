/** Client-safe helper — calls the profile ensure API route (not a Server Action). */
export async function ensureProfileClient(input?: {
  fullName?: string | null
  avatarUrl?: string | null
}) {
  try {
    const res = await fetch('/api/profile/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(input ?? {}),
    })
    if (!res.ok) return { ok: false as const }
    return (await res.json()) as { ok: boolean }
  } catch {
    return { ok: false as const }
  }
}
