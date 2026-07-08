"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { Calendar, Views, momentLocalizer, type View } from "react-big-calendar"
import moment from "moment"
import {
  CalendarDaysIcon,
  CameraIcon,
  Clock3Icon,
  CoffeeIcon,
  MapPinIcon,
  PlayIcon,
  ShieldCheckIcon,
  SquareIcon,
} from "lucide-react"
import "react-big-calendar/lib/css/react-big-calendar.css"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/reusable/tables"
import Modal from "@/components/reusable/cards/Modal"
import { CameraModal } from "@/components/reusable/cards/CameraModal"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchHistory, fetchHistorySummary } from "@/states/features/attendance.slice"
import { fetchMyShifts } from "@/states/features/scheduling.slice"
import { ShiftInstanceStatus, type MyShift } from "@/lib/api/scheduling.api"
import { useClockSession } from "@/hooks/use-clock-session"
import {
  formatDate,
  formatTime,
  sessionToEntry,
  statusClassNames,
  type RecentEntry,
} from "@/lib/attendance.utils"

function shiftDayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return formatDate(iso)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function upcomingShiftRange() {
  const from = new Date()
  const to = new Date(from)
  to.setDate(from.getDate() + 30)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

const columns: ColumnDef<RecentEntry>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">{row.original.date}</div>
    ),
    meta: { width: "7rem" },
  },
  {
    id: "shift",
    header: "Shift",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.clockIn} - {row.original.clockOut ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "hours",
    header: "Hours",
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">{getValue<number>().toFixed(2)}h</span>
    ),
    meta: { align: "right", width: "6rem" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={`inline-flex h-6 items-center border px-2 text-[13px] font-normal uppercase ${statusClassNames[row.original.status]}`}
      >
        {row.original.status}
      </span>
    ),
  },
]

type StatusFilter = "All" | "Approved" | "Pending" | "Draft"

const myShiftCalendarLocalizer = momentLocalizer(moment)

type MyShiftCalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  shift: MyShift
}

function MyShiftCalendar({
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

const Timesheets = () => {
  const dispatch = useAppDispatch()

  const history = useAppSelector((s) => s.attendance.history)
  const historySummary = useAppSelector((s) => s.attendance.historySummary)
  const isHistoryLoading = useAppSelector((s) => s.attendance.status.history === "loading")
  const isLoading = isHistoryLoading && history.data.length === 0
  const isFetching = isHistoryLoading && history.data.length > 0
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const myShifts = useAppSelector((s) => s.scheduling.myShifts)
  const areShiftsLoading = useAppSelector((s) => s.scheduling.status.myShifts === "loading")

  const canClockInOut = permissions.includes("attendance.clock_in.self")
  const canViewShifts = permissions.includes("shift.read")

  const {
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    breakLoading,
    actionLoading,
    effectivePolicy,
    handleClockIn,
    handleClockOut,
    handleStartBreak,
    handleEndBreak,
  } = useClockSession()

  const [cameraModalOpen, setCameraModalOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<'in' | 'out' | null>(null)
  const [selectedShift, setSelectedShift] = React.useState<MyShift | null>(null)

  const handleClockButton = () => {
    const needsPhoto = isOnShift
      ? effectivePolicy?.requireClockOutPhoto
      : effectivePolicy?.requireClockInPhoto
    if (needsPhoto) {
      setPendingAction(isOnShift ? 'out' : 'in')
      setCameraModalOpen(true)
    } else {
      if (isOnShift) handleClockOut()
      else handleClockIn()
    }
  }

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("All")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  React.useEffect(() => {
    dispatch(
      fetchHistory({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        status: statusFilter === "All" ? undefined : statusFilter,
      })
    )
  }, [dispatch, pagination.pageIndex, pagination.pageSize, statusFilter])

  React.useEffect(() => {
    dispatch(fetchHistorySummary())
  }, [dispatch])

  const [myShiftRange, setMyShiftRange] = React.useState(() => upcomingShiftRange())

  React.useEffect(() => {
    if (!canViewShifts) return
    dispatch(fetchMyShifts(myShiftRange))
  }, [dispatch, canViewShifts, myShiftRange])

  const handleMyShiftCalendarRangeChange = React.useCallback((from: string, to: string) => {
    setMyShiftRange((current) =>
      current.from === from && current.to === to ? current : { from, to },
    )
  }, [])

  const myUpcomingShifts = React.useMemo(() => {
    const now = new Date().getTime()
    return myShifts
      .filter(
        (myShift) =>
          (myShift.status === ShiftInstanceStatus.SCHEDULED ||
            myShift.status === ShiftInstanceStatus.MODIFIED) &&
          new Date(myShift.endAt).getTime() >= now
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [myShifts])

  const [nextShift, ...laterShifts] = myUpcomingShifts
  const currentShiftLabel = isOnShift && currentSession
    ? `Started ${formatTime(currentSession.actualClockInAt)}`
    : nextShift
      ? `${shiftDayLabel(nextShift.startAt)} at ${formatTime(nextShift.startAt)}`
      : "No upcoming shift"
  const readinessItems = [
    {
      label: effectivePolicy?.requireLocation ? "Location required" : "Location ready",
      icon: MapPinIcon,
    },
    {
      label:
        effectivePolicy?.requireClockInPhoto || effectivePolicy?.requireClockOutPhoto
          ? "Photo required"
          : "Photo optional",
      icon: CameraIcon,
    },
    {
      label: isOnShift ? "Clock-out available" : "Clock-in available",
      icon: ShieldCheckIcon,
    },
  ]

  const entries = React.useMemo(() => history.data.map(sessionToEntry), [history.data])

  const totalHours = React.useMemo(
    () =>
      Math.round(
        historySummary.reduce((sum, s) => sum + ((s.netMinutes ?? s.grossMinutes ?? 0) / 60), 0) * 10
      ) / 10,
    [historySummary]
  )

  const daysWorked = React.useMemo(
    () => new Set(historySummary.map((s) => formatDate(s.actualClockInAt))).size,
    [historySummary]
  )

  const pendingCount = React.useMemo(
    () => historySummary.map(sessionToEntry).filter((e) => e.status === "Pending").length,
    [historySummary]
  )

  const summaryCards = [
    { label: "Total hours", value: String(totalHours), sub: "all time" },
    { label: "Days worked", value: String(daysWorked), sub: "all time" },
    { label: "Pending review", value: String(pendingCount), sub: "sessions" },
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* Clock In / Out */}
            {canClockInOut && (
              <Card className="employee-action-card">
                <CardHeader className="gap-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardDescription className="operations-label">
                      Current shift
                    </CardDescription>
                    <CardTitle className="text-xl font-semibold tracking-tight">
                      {isOnShift ? "On duty" : "Ready when you are"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {currentShiftLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {readinessItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <span key={item.label} className="employee-readiness-chip">
                          <Icon className="size-3.5" aria-hidden="true" />
                          {item.label}
                        </span>
                      )
                    })}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                      <div className="text-sm font-medium">
                        {isOnShift ? "Your time is recording." : "Start from your scheduled shift when you arrive."}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {isOnShift
                          ? "Use break controls during rest periods, then clock out when your shift ends."
                          : nextShift
                            ? `${nextShift.patternName || "Scheduled shift"} · ${formatTime(nextShift.startAt)} – ${formatTime(nextShift.endAt)}`
                            : "No scheduled shift is waiting, but you can still clock in if your policy allows it."}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {isOnShift && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleStartBreak}
                            disabled={breakLoading}
                          >
                            <CoffeeIcon data-icon="inline-start" />
                            Start break
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleEndBreak}
                            disabled={breakLoading}
                          >
                            <Clock3Icon data-icon="inline-start" />
                            End break
                          </Button>
                        </>
                      )}
                      <Button
                        size="lg"
                        className="h-11 rounded-xs px-8 text-sm font-medium"
                        onClick={handleClockButton}
                        variant={isOnShift ? "destructive" : "default"}
                        disabled={actionLoading}
                      >
                        {isOnShift ? (
                          <>
                            <SquareIcon data-icon="inline-start" />
                            {clockOutLoading ? "Clocking out…" : "Clock Out"}
                          </>
                        ) : (
                          <>
                            <PlayIcon data-icon="inline-start" />
                            {clockInLoading ? "Clocking in…" : "Clock In"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <CameraModal
              isOpen={cameraModalOpen}
              onClose={() => { setCameraModalOpen(false); setPendingAction(null) }}
              heading={pendingAction === 'in' ? 'Photo required to clock in' : 'Photo required to clock out'}
              onCapture={(mediaAssetId) => {
                setCameraModalOpen(false)
                if (pendingAction === 'in') handleClockIn(mediaAssetId)
                else handleClockOut(mediaAssetId)
                setPendingAction(null)
              }}
            />

            {/* My shifts */}
            {canViewShifts && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                      Schedule
                    </CardDescription>
                    <CardTitle className="text-base font-medium">My shifts</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-0">
                    {nextShift ? (
                      <button
                        type="button"
                        onClick={() => setSelectedShift(nextShift)}
                        className="relative flex w-full flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 pl-4 text-left transition-colors before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div>
                          <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-primary">
                            {shiftDayLabel(nextShift.startAt)}
                          </div>
                          <div className="text-lg font-semibold tabular-nums tracking-tight">
                            {formatTime(nextShift.startAt)} – {formatTime(nextShift.endAt)}
                          </div>
                        </div>
                        <span className="text-[13px] text-muted-foreground tabular-nums">
                          {formatDate(nextShift.startAt)}
                        </span>
                      </button>
                    ) : (
                      <p className="py-3 pl-4 text-sm text-muted-foreground">
                        {areShiftsLoading ? "Loading shifts…" : "No upcoming shifts scheduled."}
                      </p>
                    )}

                    {laterShifts.length > 0 && (
                      <ul className="flex flex-col">
                        {laterShifts.slice(0, 5).map((myShift) => (
                          <li key={myShift.id} className="border-b border-border/40 last:border-b-0">
                            <button
                              type="button"
                              onClick={() => setSelectedShift(myShift)}
                              className="flex w-full items-center justify-between py-2.5 pl-4 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <span className="text-muted-foreground">{shiftDayLabel(myShift.startAt)}</span>
                              <span className="tabular-nums">
                                {formatTime(myShift.startAt)} – {formatTime(myShift.endAt)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <MyShiftCalendar
                  shifts={myUpcomingShifts}
                  onRangeChange={handleMyShiftCalendarRangeChange}
                  onSelectShift={setSelectedShift}
                />
              </>
            )}

            <Modal
              isOpen={Boolean(selectedShift)}
              onClose={() => setSelectedShift(null)}
              heading="Shift details"
              description="Review the scheduled time before clocking in."
              className="min-w-[32rem]"
            >
              {selectedShift && (
                <div className="space-y-4">
                  <div className="rounded-md border border-border/60 p-4">
                    <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-primary">
                      {shiftDayLabel(selectedShift.startAt)}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                      {formatTime(selectedShift.startAt)} – {formatTime(selectedShift.endAt)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground tabular-nums">
                      {formatDate(selectedShift.startAt)}
                    </div>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="font-medium">{selectedShift.status}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Shift ID</dt>
                      <dd className="truncate font-mono text-xs">{selectedShift.id}</dd>
                    </div>
                  </dl>
                  {canClockInOut && !isOnShift && (
                    <Button className="w-full" onClick={handleClockButton} disabled={actionLoading}>
                      <PlayIcon data-icon="inline-start" />
                      {clockInLoading ? "Clocking in…" : "Clock In"}
                    </Button>
                  )}
                </div>
              )}
            </Modal>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {summaryCards.map((m, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                      {m.label}
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold tabular-nums tracking-tighter">
                      {m.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[13px] text-muted-foreground">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* History table */}
            <DataTable
              eyebrow="Attendance"
              title="My timesheets"
              columns={columns}
              data={entries}
              getRowId={(entry) => entry.id}
              pagination={pagination}
              paginationInfo={history}
              onPaginationChange={setPagination}
              rowCount={history.total}
              pageSizeOptions={[8, 16, 32]}
              syncPaginationFromInfo
              isLoading={isLoading}
              isFetching={isFetching}
              emptyTitle="No timesheet entries"
              emptyDescription="Clock in to start recording your attendance."
              toolbar={
                <Select
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger className="h-11 w-48 text-sm">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All statuses</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Timesheets
