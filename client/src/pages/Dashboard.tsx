"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { CalendarIcon, FileTextIcon, PlayIcon, SquareIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DataTable } from "@/components/reusable/tables"
import { CameraModal } from "@/components/reusable/cards/CameraModal"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchHistory, fetchHistorySummary } from "@/states/features/attendance.slice"
import { WorkSessionStatus } from "@/lib/api/attendance.api"
import { useClockSession } from "@/hooks/use-clock-session"
import {
  computeWeeklyHours,
  formatTime,
  sessionToEntry,
  statusClassNames,
  type RecentEntry,
} from "@/lib/attendance.utils"

// --- Chart config ---
const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const recentEntryColumns: ColumnDef<RecentEntry>[] = [
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
        {row.original.clockIn} - {row.original.clockOut ?? "-"}
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
    meta: { align: "right", width: "8rem" },
  },
]

const Dashboard = () => {
  const dispatch = useAppDispatch()

  const history = useAppSelector((s) => s.attendance.history)
  const historySummary = useAppSelector((s) => s.attendance.historySummary)
  const isHistoryLoading = useAppSelector((s) => s.attendance.status.history === "loading")
  const isRecentLoading = isHistoryLoading && history.data.length === 0
  const isRecentFetching = isHistoryLoading && history.data.length > 0
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const roleNames = useAppSelector((s) => s.auth.user?.roleNames ?? [])
  const canClockInOut = permissions.includes("attendance.clock_in.self")
  const canManageShifts = permissions.includes("shift.create")
  const isOrganizationAdmin = roleNames.includes("Organization Admin")
  const canUseEmployeeAttendance = canClockInOut && !isOrganizationAdmin

  const {
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    actionLoading,
    effectivePolicy,
    handleClockIn,
    handleClockOut,
  } = useClockSession(canUseEmployeeAttendance)

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

  const [recentPagination, setRecentPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 4,
  })

  React.useEffect(() => {
    if (!canUseEmployeeAttendance) return

    dispatch(
      fetchHistory({ page: recentPagination.pageIndex + 1, pageSize: recentPagination.pageSize })
    )
  }, [canUseEmployeeAttendance, dispatch, recentPagination.pageIndex, recentPagination.pageSize])

  React.useEffect(() => {
    dispatch(fetchHistorySummary())
  }, [dispatch])

  // Derived metrics
  const weeklyData = React.useMemo(() => computeWeeklyHours(historySummary), [historySummary])

  const weekHours = React.useMemo(
    () => Math.round(weeklyData.reduce((sum, d) => sum + d.hours, 0) * 10) / 10,
    [weeklyData]
  )

  const todayHours = React.useMemo(() => {
    const today = new Date().toDateString()
    const minutes = historySummary
      .filter((s) => new Date(s.actualClockInAt).toDateString() === today)
      .reduce((sum, s) => sum + (s.netMinutes ?? s.grossMinutes ?? 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [historySummary])

  const daysWorked = React.useMemo(() => {
    const week = new Set(
      weeklyData.flatMap((d, idx) => (d.hours > 0 ? [idx] : []))
    )
    return week.size
  }, [weeklyData])

  const teamOnDuty = orgSessions.filter((s) => s.status === WorkSessionStatus.OPEN).length

  const recentEntries = React.useMemo(() => history.data.map(sessionToEntry), [history.data])

  const metrics = [
    { label: "Hours this week", value: String(weekHours), sub: "of 40 target" },
    {
      label: "Today logged",
      value: todayHours.toFixed(1),
      sub: isOnShift ? "On shift" : "Complete",
    },
    { label: "Days worked", value: String(daysWorked), sub: "this week" },
    {
      label: "Team on duty",
      value: teamOnDuty > 0 ? String(teamOnDuty) : "-",
      sub: "across wards",
    },
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
            {canUseEmployeeAttendance && (
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

                    <div className="text-sm text-muted-foreground">
                      {isOnShift
                        ? "You are currently recording time. Tap clock out when your shift ends."
                        : "Ready to start your shift? Use the button to begin tracking."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {canUseEmployeeAttendance && (
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
            )}

            {/* Metrics grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m, idx) => (
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

            {/* Quick navigation */}
            <div className={cn("grid gap-4", canManageShifts && canUseEmployeeAttendance && "sm:grid-cols-2")}>
              {canManageShifts && (
                <Card className="group">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                      Operations
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      Create shifts and assign employees.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      asChild
                    >
                      <Link to="/scheduling">Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {canUseEmployeeAttendance && (
                <Card className="group">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                      My records
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                      <FileTextIcon className="size-4 text-muted-foreground" />
                      Timesheets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      View and manage your full attendance history.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      asChild
                    >
                      <Link to="/timesheets">Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Weekly hours chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                  Attendance
                </CardDescription>
                <CardTitle className="text-base font-medium">Hours this week</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="aspect-video h-[220px] w-full"
                >
                  <AreaChart
                    accessibilityLayer
                    data={weeklyData}
                    margin={{ left: 4, right: 4, top: 8 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="2 2" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      dataKey="hours"
                      type="natural"
                      fill="var(--color-hours)"
                      fillOpacity={0.35}
                      stroke="var(--color-hours)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Recent activity */}
            {canUseEmployeeAttendance && (
              <DataTable
                eyebrow="Recent"
                title="Recent entries"
                columns={recentEntryColumns}
                data={recentEntries}
                getRowId={(entry) => entry.id}
                pagination={recentPagination}
                paginationInfo={history}
                onPaginationChange={setRecentPagination}
                rowCount={history.total}
                pageSizeOptions={[4, 8, 12]}
                isLoading={isRecentLoading}
                isFetching={isRecentFetching}
                emptyTitle="No recent entries"
                emptyDescription="Clock in to start a new timesheet entry."
                actions={
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/timesheets">View all</Link>
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Dashboard
