import moment from "moment"
import { momentLocalizer } from "react-big-calendar"

import type { BadgeTone } from "@/components/ui/badge"
import { toIsoDate } from "@/lib/format"
import { formatDate, type RecentEntry } from "@/lib/attendance.utils"
import type { MyShift } from "@/lib/api/scheduling.api"

/** Status filter options for the timesheet history table. */
export type StatusFilter = "All" | "Approved" | "Pending" | "Draft"

/** Calendar event shape for the employee "My shifts" calendar. */
export type MyShiftCalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  shift: MyShift
}

export const myShiftCalendarLocalizer = momentLocalizer(moment)

/** Status -> badge tone mapping for the timesheet history table. */
export const entryStatusTone: Record<RecentEntry["status"], BadgeTone> = {
  Approved: "success",
  Pending: "warning",
  Draft: "default",
}

/** Human day label for a shift start: "Today", "Tomorrow", or a short date. */
export function shiftDayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return formatDate(iso)
}

/** Default 30-day forward range used when fetching upcoming shifts. */
export function upcomingShiftRange() {
  const from = new Date()
  const to = new Date(from)
  to.setDate(from.getDate() + 30)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}
