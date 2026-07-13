import type { ComponentType } from "react"

import { toIsoDate } from "@/lib/format"
import { formatDate } from "@/lib/attendance.utils"
import { WorkSessionStatus, type WorkSession } from "@/lib/api/attendance.api"

/** Shape of an admin shortcut tile rendered on the command-center home. */
export type AdminTile = {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  count: number | null
  countLabel: string | null
}

/** A session that still needs someone to review or resolve it. */
export function isPendingSession(session: WorkSession) {
  return (
    session.status === WorkSessionStatus.PENDING_REVIEW ||
    session.status === WorkSessionStatus.CLOCKED_OUT ||
    session.hasExceptions ||
    session.reviewStatus === "REQUIRED"
  )
}

/** Time-of-day greeting prefix, e.g. "Good morning". */
export function greetingForNow(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/** Elapsed time since `startedAt` as `Xh Ym` / `Ym`, relative to `nowMs`. */
export function formatElapsed(startedAt: string, nowMs: number) {
  const started = new Date(startedAt).getTime()
  if (Number.isNaN(started)) return "—"
  const totalMinutes = Math.max(0, Math.floor((nowMs - started) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

/** Relative day label for a shift start: "Today", "Tomorrow", or a short date. */
export function shiftDayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return formatDate(iso)
}

/** Two-week window (today → +14 days) used to fetch the employee's shifts. */
export function upcomingShiftRange() {
  const from = new Date()
  const to = new Date(from)
  to.setDate(from.getDate() + 14)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}
