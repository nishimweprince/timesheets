/**
 * Canonical formatting helpers shared across the app.
 *
 * These consolidate the `formatDate`/`formatTime`/`statusLabel`/`employeeName`/
 * `shortId` helpers that were previously copy-pasted into ~8 page files. Import
 * from here instead of redefining locally.
 */

type EmployeeNameParts = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

/** First 8 (or `length`) characters of an id, for compact display. */
export function shortId(id: string, length = 8): string {
  return id.slice(0, length)
}

/**
 * Render a `YYYY-MM-DD` string as a local calendar date without timezone shift.
 * Falls back to the raw input when it isn't a valid ISO date.
 */
export function formatDateISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** 24-hour `HH:MM` time from an ISO timestamp. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/** Human date + time, e.g. "Jul 12, 2026, 09:00". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Duration between two ISO timestamps as `Xh Ym` (never negative). */
export function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.max(
    0,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000),
  )
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Turn an ENUM_LIKE_STATUS into a human "Enum Like Status" label.
 * (Previously `statusLabel` in Scheduling.)
 */
export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

/** Full name from parts, falling back to email then empty string. */
export function employeeName(employee: EmployeeNameParts): string {
  const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
  return name || employee.email || ""
}

/** Serialize a Date to `YYYY-MM-DD` in local time. Empty string for undefined. */
export function toIsoDate(date: Date | undefined): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Parse `YYYY-MM-DD` as a local calendar date. Returns null if invalid. */
export function parseDayParam(value: string | null): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null
  }
  return date
}

/** Human date label for an optional Date, e.g. "Jul 12, 2026" or "" when undefined. */
export function formatDateLabel(date: Date | undefined): string {
  if (!date) return ""
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
