import * as React from "react"
import { Calendar, Views, type View } from "react-big-calendar"
import { colord } from "colord"
import { Clock3, Eye, UsersRound } from "lucide-react"
import "react-big-calendar/lib/css/react-big-calendar.css"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppSelector } from "@/states/store/hooks.state"
import { formatTime, shortId, toIsoDate, humanizeStatus, employeeName } from "@/lib/format"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftInstance,
  type ShiftPattern,
  type ShiftPatternAssignment,
} from "@/lib/api/scheduling.api"
import { calendarLocalizer, calendarPalette } from "../scheduling.constants"

export type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  instance: ShiftInstance
  assignmentSummary: string
  assignedNames: string[]
  patternName: string
}

function calendarEventBaseColor(event: CalendarEvent) {
  if (event.instance.status === ShiftInstanceStatus.CANCELLED) return calendarPalette.cancelled
  if (event.instance.status === ShiftInstanceStatus.COMPLETED) return calendarPalette.completed
  if (event.instance.status === ShiftInstanceStatus.MODIFIED) return calendarPalette.modified
  return event.assignedNames.length > 0 ? calendarPalette.assigned : calendarPalette.unassigned
}

function getCalendarEventColors(event: CalendarEvent) {
  const base = colord(calendarEventBaseColor(event))
  const isLight = base.isLight()
  const foreground = isLight ? calendarPalette.ink : "#FFFFFF"
  return {
    background: base.toHex(),
    border: isLight ? base.darken(0.16).toHex() : base.darken(0.08).toHex(),
    foreground,
    muted: colord(foreground).alpha(isLight ? 0.72 : 0.82).toRgbString(),
    hover: isLight ? base.darken(0.05).toHex() : base.lighten(0.06).toHex(),
  }
}

function CalendarEventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="scheduling-calendar-event-card">
      <div className="scheduling-calendar-event-body">
        <div className="scheduling-calendar-event-time">
          <Clock3 aria-hidden="true" />
          <span>{formatTime(event.instance.startAt)} - {formatTime(event.instance.endAt)}</span>
        </div>
        <div className="scheduling-calendar-event-main">
          <UsersRound aria-hidden="true" />
          <span>{event.assignmentSummary}</span>
        </div>
        {event.patternName && (
          <div className="scheduling-calendar-event-pattern">
            {event.patternName}
          </div>
        )}
        <div className="scheduling-calendar-event-meta">
          <span>{humanizeStatus(event.instance.status)}</span>
          <span className="scheduling-calendar-event-detail">
            <Eye aria-hidden="true" />
            Details
          </span>
        </div>
      </div>
    </div>
  )
}

export function CalendarTab({
  instances,
  patterns,
  patternAssignments,
  onRangeChange,
  onSelectInstance,
  includeCancelled,
  includeCompleted,
  onToggleCancelled,
  onToggleCompleted,
}: {
  instances: ShiftInstance[]
  patterns: ShiftPattern[]
  patternAssignments: ShiftPatternAssignment[]
  onRangeChange: (from: string, to: string) => void
  onSelectInstance: (instance: ShiftInstance) => void
  includeCancelled: boolean
  includeCompleted: boolean
  onToggleCancelled: (checked: boolean) => void
  onToggleCompleted: (checked: boolean) => void
}) {
  const [calendarView, setCalendarView] = React.useState<View>(Views.WEEK)
  const [calendarDate, setCalendarDate] = React.useState(() => new Date())
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])

  const assignmentsByPatternId = React.useMemo(() => {
    const map = new Map<string, ShiftPatternAssignment[]>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      const existing = map.get(assignment.shiftPatternId) ?? []
      existing.push(assignment)
      map.set(assignment.shiftPatternId, existing)
    }
    return map
  }, [patternAssignments])

  const patternById = React.useMemo(() => {
    const map = new Map<string, ShiftPattern>()
    for (const pattern of patterns) map.set(pattern.id, pattern)
    return map
  }, [patterns])

  const visibleInstances = React.useMemo(
    () =>
      instances.filter((instance) => {
        if (instance.status === ShiftInstanceStatus.CANCELLED) return includeCancelled
        if (instance.status === ShiftInstanceStatus.COMPLETED) return includeCompleted
        return instance.status === ShiftInstanceStatus.SCHEDULED || instance.status === ShiftInstanceStatus.MODIFIED
      }),
    [includeCancelled, includeCompleted, instances],
  )

  const events = React.useMemo<CalendarEvent[]>(
    () =>
      visibleInstances.map((instance) => {
        const activeAssignments = instance.patternId
          ? assignmentsByPatternId.get(instance.patternId) ?? []
          : []
        const names = activeAssignments.map(
          (assignment) => employeeByMembershipId.get(assignment.employeeMembershipId) ?? shortId(assignment.employeeMembershipId),
        )
        const assignmentSummary =
          names.length === 0
            ? "Unassigned"
            : names.length === 1
              ? names[0]
              : `${names[0]} +${names.length - 1}`
        return {
          id: instance.id,
          title: assignmentSummary,
          start: new Date(instance.startAt),
          end: new Date(instance.endAt),
          instance,
          assignmentSummary,
          assignedNames: names,
          patternName: instance.patternId
            ? patternById.get(instance.patternId)?.name ?? shortId(instance.patternId)
            : "",
        }
      }),
    [assignmentsByPatternId, employeeByMembershipId, patternById, visibleInstances],
  )

  const handleRangeChange = React.useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      const dates = Array.isArray(range) ? range : [range.start, range.end]
      const from = new Date(Math.min(...dates.map((date) => date.getTime())))
      const to = new Date(Math.max(...dates.map((date) => date.getTime())))
      onRangeChange(toIsoDate(from), toIsoDate(to))
    },
    [onRangeChange],
  )

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription className="text-[13px] uppercase tracking-[0.12em]">Scheduling</CardDescription>
          <CardTitle>Calendar</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeCancelled} onChange={(e) => onToggleCancelled(e.target.checked)} />
            Show cancelled
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeCompleted} onChange={(e) => onToggleCompleted(e.target.checked)} />
            Show completed
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="scheduling-calendar h-[680px] rounded-md border border-border bg-background p-2">
          <Calendar<CalendarEvent>
            localizer={calendarLocalizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            view={calendarView}
            date={calendarDate}
            onView={setCalendarView}
            onNavigate={setCalendarDate}
            popup
            onRangeChange={handleRangeChange}
            onSelectEvent={(event) => onSelectInstance(event.instance)}
            components={{
              event: ({ event }) => <CalendarEventCard event={event} />,
            }}
            eventPropGetter={(event) => {
              const colors = getCalendarEventColors(event)
              return {
                className: "scheduling-calendar-event",
                style: {
                  "--event-bg": colors.background,
                  "--event-border": colors.border,
                  "--event-fg": colors.foreground,
                  "--event-muted": colors.muted,
                  "--event-hover": colors.hover,
                } as React.CSSProperties,
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default CalendarTab
