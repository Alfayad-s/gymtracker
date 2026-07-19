/**
 * Parse InBody / BIA "test taken" date-time strings into a valid Date.
 * Common printed formats: 2024.07.15 14:30, 2024/07/15, 15-07-2024 2:30 PM, etc.
 */
export function parseInBodyDateTime(raw: string | null | undefined): Date | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  // Already ISO-ish
  const isoTry = Date.parse(s)
  if (!Number.isNaN(isoTry) && looksReasonable(isoTry)) {
    // Prefer explicit parsers for ambiguous DD/MM vs MM/DD below when only digits+slashes
    if (!/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(s)) {
      return new Date(isoTry)
    }
  }

  // YYYY.MM.DD[ HH:mm[:ss]] or YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (m) {
    return buildDate(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
  }

  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY [time] [AM/PM]
  m = s.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?/
  )
  if (m) {
    let hour = +(m[4] ?? 0)
    const min = +(m[5] ?? 0)
    const sec = +(m[6] ?? 0)
    const ap = m[7]?.toUpperCase()
    if (ap === 'PM' && hour < 12) hour += 12
    if (ap === 'AM' && hour === 12) hour = 0
    // Prefer D/M/Y (InBody common outside US)
    const day = +m[1]
    const month = +m[2]
    if (month <= 12 && day <= 31) {
      return buildDate(+m[3], month, day, hour, min, sec)
    }
  }

  // "Jul 15, 2024 14:30" / "15 Jul 2024 2:30 PM"
  m = s.match(
    /^(?:(\d{1,2})\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?/
  )
  if (m) {
    const month = monthFromName(m[2])
    if (month != null) {
      const day = +(m[1] || m[3])
      const year = +m[4]
      let hour = +(m[5] ?? 0)
      const min = +(m[6] ?? 0)
      const sec = +(m[7] ?? 0)
      const ap = m[8]?.toUpperCase()
      if (ap === 'PM' && hour < 12) hour += 12
      if (ap === 'AM' && hour === 12) hour = 0
      return buildDate(year, month, day, hour, min, sec)
    }
  }

  // "2024년 7월 15일 14:30" (Korean InBody)
  m = s.match(
    /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (m) {
    return buildDate(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
  }

  if (!Number.isNaN(isoTry) && looksReasonable(isoTry)) return new Date(isoTry)
  return null
}

function monthFromName(name: string): number | null {
  const key = name.slice(0, 3).toLowerCase()
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }
  return map[key] ?? null
}

function buildDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day, hour, minute, second)
  if (Number.isNaN(d.getTime())) return null
  if (!looksReasonable(d.getTime())) return null
  return d
}

function looksReasonable(ms: number) {
  const y = new Date(ms).getFullYear()
  return y >= 2000 && y <= 2100
}

/** Normalize extract.date to ISO string for storage / datetime-local inputs. */
export function normalizeReportDateIso(raw: string | null | undefined): string | null {
  const d = parseInBodyDateTime(raw)
  return d ? d.toISOString() : null
}

/** Value for `<input type="datetime-local" />` (local timezone). */
export function toDatetimeLocalValue(isoOrRaw: string | null | undefined): string {
  const d = parseInBodyDateTime(isoOrRaw) ?? (isoOrRaw ? new Date(isoOrRaw) : null)
  if (!d || Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** From datetime-local value → ISO. */
export function fromDatetimeLocalValue(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function formatReportDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatReportDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  if (hasTime) {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
}
