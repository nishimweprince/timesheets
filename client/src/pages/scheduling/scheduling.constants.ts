import moment from "moment"
import { momentLocalizer } from "react-big-calendar"

import type { BadgeTone } from "@/components/ui/badge"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
} from "@/lib/api/scheduling.api"

/** Which sub-view of the scheduling area is rendered. */
export type SchedulingView = "coverage" | "clock-ins" | "shifts" | "assignments"

/** Recurrence options offered when creating a shift pattern. */
export type Recurrence = "none" | "weekly"

export const calendarLocalizer = momentLocalizer(moment)

export const WEEKDAYS: { iso: number; label: string; short: string }[] = [
  { iso: 1, label: "Monday", short: "Mon" },
  { iso: 2, label: "Tuesday", short: "Tue" },
  { iso: 3, label: "Wednesday", short: "Wed" },
  { iso: 4, label: "Thursday", short: "Thu" },
  { iso: 5, label: "Friday", short: "Fri" },
  { iso: 6, label: "Saturday", short: "Sat" },
  { iso: 7, label: "Sunday", short: "Sun" },
]

export const WEEKDAY_PRESETS: { key: string; label: string; days: number[] }[] = [
  { key: "weekdays", label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { key: "weekends", label: "Weekends", days: [6, 7] },
  { key: "every_day", label: "Every day", days: [1, 2, 3, 4, 5, 6, 7] },
]

export const calendarPalette = {
  ink: "#12313F",
  assigned: "#12806A",
  unassigned: "#B56B12",
  modified: "#6D5BD0",
  completed: "#2563EB",
  cancelled: "#64748B",
} as const

/** Status -> badge tone mappings, shared by tables and the detail sheet. */
export const instanceStatusTone: Record<ShiftInstanceStatus, BadgeTone> = {
  [ShiftInstanceStatus.SCHEDULED]: "success",
  [ShiftInstanceStatus.CANCELLED]: "default",
  [ShiftInstanceStatus.MODIFIED]: "warning",
  [ShiftInstanceStatus.COMPLETED]: "info",
}

export const assignmentStatusTone: Record<ShiftAssignmentStatus, BadgeTone> = {
  [ShiftAssignmentStatus.ACTIVE]: "success",
  [ShiftAssignmentStatus.CANCELLED]: "default",
  [ShiftAssignmentStatus.REASSIGNED]: "warning",
}

/** Human label for a set of ISO weekday numbers (e.g. "Weekdays", "Mon, Wed"). */
export function daysLabel(days: number[]): string {
  if (!days.length) return "Does not repeat"
  const sorted = [...days].sort((a, b) => a - b)
  for (const preset of WEEKDAY_PRESETS) {
    if (
      preset.days.length === sorted.length &&
      preset.days.every((d, i) => d === sorted[i])
    ) {
      return preset.label
    }
  }
  return sorted.map((d) => WEEKDAYS[d - 1].short).join(", ")
}

/** ISO timestamp -> `YYYY-MM-DDTHH:MM` in local time, for `datetime-local` inputs. */
export function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
