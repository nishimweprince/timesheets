import { WorkSessionStatus, type WorkSession } from "@/lib/api/attendance.api"

export type RecentEntry = {
  id: string
  date: string
  clockIn: string
  clockOut: string | null
  hours: number
  status: "Approved" | "Pending" | "Draft"
}

export const statusClassNames: Record<RecentEntry["status"], string> = {
  Approved: "border-success/20 bg-success/10 text-success",
  Pending: "border-warning/25 bg-warning/10 text-warning",
  Draft: "border-border bg-muted text-muted-foreground",
}

export function mapSessionStatus(status: WorkSessionStatus): RecentEntry["status"] {
  if (status === WorkSessionStatus.APPROVED || status === WorkSessionStatus.LOCKED) return "Approved"
  if (status === WorkSessionStatus.REJECTED || status === WorkSessionStatus.CANCELLED) return "Draft"
  return "Pending"
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function sessionToEntry(session: WorkSession): RecentEntry {
  const minutes = session.netMinutes ?? session.grossMinutes ?? 0
  return {
    id: session.id,
    date: formatDate(session.actualClockInAt),
    clockIn: formatTime(session.actualClockInAt),
    clockOut: session.actualClockOutAt ? formatTime(session.actualClockOutAt) : null,
    hours: Math.round((minutes / 60) * 100) / 100,
    status: mapSessionStatus(session.status),
  }
}

export function computeWeeklyHours(sessions: WorkSession[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  return days.map((day, idx) => {
    const dayStart = new Date(monday)
    dayStart.setDate(monday.getDate() + idx)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)

    const totalMinutes = sessions
      .filter((s) => {
        const t = new Date(s.actualClockInAt)
        return t >= dayStart && t < dayEnd
      })
      .reduce((sum, s) => sum + (s.netMinutes ?? s.grossMinutes ?? 0), 0)

    return { day, hours: Math.round((totalMinutes / 60) * 100) / 100, target: idx < 5 ? 8 : 0 }
  })
}
