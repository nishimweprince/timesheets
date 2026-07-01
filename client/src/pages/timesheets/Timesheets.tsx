"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { PlayIcon, SquareIcon } from "lucide-react"

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
import { CameraModal } from "@/components/reusable/cards/CameraModal"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchHistory, fetchHistorySummary } from "@/states/features/attendance.slice"
import { fetchAssignments, fetchInstances } from "@/states/features/scheduling.slice"
import { ShiftAssignmentStatus, ShiftInstanceStatus } from "@/lib/api/scheduling.api"
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

const Timesheets = () => {
  const dispatch = useAppDispatch()

  const history = useAppSelector((s) => s.attendance.history)
  const historySummary = useAppSelector((s) => s.attendance.historySummary)
  const isHistoryLoading = useAppSelector((s) => s.attendance.status.history === "loading")
  const isLoading = isHistoryLoading && history.data.length === 0
  const isFetching = isHistoryLoading && history.data.length > 0
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const membershipId = useAppSelector((s) => s.auth.user?.membershipId)
  const instances = useAppSelector((s) => s.scheduling.instances)
  const assignments = useAppSelector((s) => s.scheduling.assignments)

  const canClockInOut = permissions.includes("attendance.clock_in.self")
  const canViewShifts = permissions.includes("shift.read")

  const {
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    actionLoading,
    effectivePolicy,
    handleClockIn,
    handleClockOut,
  } = useClockSession()

  const [cameraModalOpen, setCameraModalOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<'in' | 'out' | null>(null)

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

  React.useEffect(() => {
    if (!canViewShifts) return
    dispatch(fetchInstances())
    dispatch(fetchAssignments())
  }, [dispatch, canViewShifts])

  const myUpcomingShifts = React.useMemo(() => {
    if (!membershipId) return []
    const now = new Date().getTime()
    return assignments
      .filter((a) => a.employeeMembershipId === membershipId && a.status === ShiftAssignmentStatus.ACTIVE)
      .map((a) => instances.find((i) => i.id === a.shiftInstanceId))
      .filter(
        (i): i is NonNullable<typeof i> =>
          !!i && i.status === ShiftInstanceStatus.SCHEDULED && new Date(i.endAt).getTime() >= now
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [assignments, instances, membershipId])

  const [nextShift, ...laterShifts] = myUpcomingShifts

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
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                        Current Shift
                      </CardDescription>
                      <CardTitle className="text-lg font-semibold tracking-tight">
                        {isOnShift ? "On duty" : "Clocked out"}
                      </CardTitle>
                    </div>
                    <div className="text-right text-[13px] text-muted-foreground tabular-nums">
                      {isOnShift && currentSession
                        ? `Started ${formatTime(currentSession.actualClockInAt)}`
                        : "Last shift ended today"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="lg"
                      className="h-11 rounded-none px-8 text-sm font-medium"
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

                    <div className="text-sm text-muted-foreground">
                      {isOnShift
                        ? "You are currently recording time. Tap clock out when your shift ends."
                        : "Ready to start your shift? Use the button to begin tracking."}
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
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                    Schedule
                  </CardDescription>
                  <CardTitle className="text-base font-medium">My shifts</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-0">
                  {nextShift ? (
                    <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 pl-4 before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-primary">
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
                    </div>
                  ) : (
                    <p className="py-3 pl-4 text-sm text-muted-foreground">
                      No upcoming shifts scheduled.
                    </p>
                  )}

                  {laterShifts.length > 0 && (
                    <ul className="flex flex-col">
                      {laterShifts.slice(0, 5).map((shift) => (
                        <li
                          key={shift.id}
                          className="flex items-center justify-between border-b border-border/40 py-2.5 pl-4 text-sm last:border-b-0"
                        >
                          <span className="text-muted-foreground">{shiftDayLabel(shift.startAt)}</span>
                          <span className="tabular-nums">
                            {formatTime(shift.startAt)} – {formatTime(shift.endAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

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
