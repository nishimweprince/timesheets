import * as React from "react"
import { Calendar, Views, type View } from "react-big-calendar"
import { CalendarDaysIcon, Clock3Icon } from "lucide-react"
import "react-big-calendar/lib/css/react-big-calendar.css"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toIsoDate } from "@/lib/format"
import { formatTime } from "@/lib/attendance.utils"
import type { MyShift } from "@/lib/api/scheduling.api"

import {
  myShiftCalendarLocalizer,
  type MyShiftCalendarEvent,
} from "../timesheets.constants"

export function MyShiftCalendar({
  shifts,
  onRangeChange,
  onSelectShift,
}: {
  shifts: MyShift[]
  onRangeChange: (from: string, to: string) => void
  onSelectShift: (shift: MyShift) => void
}) {
  const [calendarView, setCalendarView] = React.useState<View>(Views.WEEK)
  const [calendarDate, setCalendarDate] = React.useState(() => new Date())

  const events = React.useMemo<MyShiftCalendarEvent[]>(
    () =>
      shifts.map((shift) => ({
        id: shift.id,
        title: shift.patternName || "Scheduled shift",
        start: new Date(shift.startAt),
        end: new Date(shift.endAt),
        shift,
      })),
    [shifts],
  )

  const handleRangeChange = React.useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      const dates = Array.isArray(range) ? range : [range.start, range.end]
      if (dates.length === 0) return

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
          <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
            Upcoming
          </CardDescription>
          <CardTitle className="text-base font-medium">Shift calendar</CardTitle>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <CalendarDaysIcon className="size-4" aria-hidden="true" />
          {shifts.length} scheduled
        </div>
      </CardHeader>
      <CardContent>
        <div className="employee-shift-calendar h-[560px] rounded-md border border-border bg-background p-2">
          <Calendar<MyShiftCalendarEvent>
            localizer={myShiftCalendarLocalizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            view={calendarView}
            date={calendarDate}
            onView={setCalendarView}
            onNavigate={setCalendarDate}
            onRangeChange={handleRangeChange}
            onSelectEvent={(event) => onSelectShift(event.shift)}
            popup
            components={{
              event: ({ event }) => (
                <div className="employee-shift-calendar-event">
                  <div className="employee-shift-calendar-event-time">
                    <Clock3Icon aria-hidden="true" />
                    <span>{formatTime(event.shift.startAt)} - {formatTime(event.shift.endAt)}</span>
                  </div>
                  <div className="employee-shift-calendar-event-title">
                    {event.shift.patternName || "Scheduled shift"}
                  </div>
                </div>
              ),
            }}
            eventPropGetter={() => ({
              className: "employee-shift-calendar-block",
            })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default MyShiftCalendar
