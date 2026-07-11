"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  FileTextIcon,
  LogInIcon,
  PlayIcon,
  SquareIcon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DataTable } from "@/components/reusable/tables"
import { CameraModal } from "@/components/reusable/cards/CameraModal"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import {
  fetchExceptions,
  fetchHistory,
  fetchHistorySummary,
  fetchOrgSessions,
} from "@/states/features/attendance.slice"
import { fetchMyShifts } from "@/states/features/scheduling.slice"
import { WorkSessionStatus, type WorkSession } from "@/lib/api/attendance.api"
import { ShiftInstanceStatus } from "@/lib/api/scheduling.api"
import { useClockSession } from "@/hooks/use-clock-session"
import {
  computeWeeklyHours,
  formatDate,
  formatTime,
  sessionToEntry,
  statusClassNames,
  type RecentEntry,
} from "@/lib/attendance.utils"

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
    meta: { align: "right", width: "8rem" },
  },
]

function isPendingSession(session: WorkSession) {
  return (
    session.status === WorkSessionStatus.PENDING_REVIEW ||
    session.status === WorkSessionStatus.CLOCKED_OUT ||
    session.hasExceptions ||
    session.reviewStatus === "REQUIRED"
  )
}

function greetingForNow(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatElapsed(startedAt: string, nowMs: number) {
  const started = new Date(startedAt).getTime()
  if (Number.isNaN(started)) return "—"
  const totalMinutes = Math.max(0, Math.floor((nowMs - started) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

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
  to.setDate(from.getDate() + 14)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

const Dashboard = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const history = useAppSelector((s) => s.attendance.history)
  const historySummary = useAppSelector((s) => s.attendance.historySummary)
  const isHistoryLoading = useAppSelector((s) => s.attendance.status.history === "loading")
  const isRecentLoading = isHistoryLoading && history.data.length === 0
  const isRecentFetching = isHistoryLoading && history.data.length > 0
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const myShifts = useAppSelector((s) => s.scheduling.myShifts)
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const roleNames = useAppSelector((s) => s.auth.user?.roleNames ?? [])

  const canClockInOut = permissions.includes("attendance.clock_in.self")
  const canReadSelf = permissions.includes("attendance.read.self")
  const canManageShifts = permissions.includes("shift.create")
  const canReadOrgAttendance = permissions.includes("attendance.read.organization")
  const canReadReports = permissions.includes("report.read")
  const canReadEmployees = permissions.includes("employee.read")
  // Organization admins operate the product; they do not clock in or keep personal timesheets.
  const isOrganizationAdmin = roleNames.includes("Organization Admin")
  const canUseEmployeeAttendance = canClockInOut && !isOrganizationAdmin
  const isAdminHome =
    isOrganizationAdmin ||
    canManageShifts ||
    canReadOrgAttendance ||
    canReadReports ||
    canReadEmployees

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
  const [pendingAction, setPendingAction] = React.useState<"in" | "out" | null>(null)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [recentPagination, setRecentPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 4,
  })
  const [myShiftRange] = React.useState(() => upcomingShiftRange())

  const handleClockButton = () => {
    const needsPhoto = isOnShift
      ? effectivePolicy?.requireClockOutPhoto
      : effectivePolicy?.requireClockInPhoto
    if (needsPhoto) {
      setPendingAction(isOnShift ? "out" : "in")
      setCameraModalOpen(true)
    } else if (isOnShift) {
      handleClockOut()
    } else {
      handleClockIn()
    }
  }

  React.useEffect(() => {
    if (!canUseEmployeeAttendance) return
    dispatch(
      fetchHistory({
        page: recentPagination.pageIndex + 1,
        pageSize: recentPagination.pageSize,
      }),
    )
  }, [canUseEmployeeAttendance, dispatch, recentPagination.pageIndex, recentPagination.pageSize])

  React.useEffect(() => {
    if (!canUseEmployeeAttendance && !canReadSelf) return
    dispatch(fetchHistorySummary())
  }, [canUseEmployeeAttendance, canReadSelf, dispatch])

  React.useEffect(() => {
    if (!canUseEmployeeAttendance) return
    dispatch(fetchMyShifts(myShiftRange))
  }, [canUseEmployeeAttendance, dispatch, myShiftRange])

  React.useEffect(() => {
    if (!canReadOrgAttendance && !canManageShifts) return
    dispatch(fetchOrgSessions())
    dispatch(fetchExceptions())
  }, [canManageShifts, canReadOrgAttendance, dispatch])

  React.useEffect(() => {
    if (!isOnShift || !currentSession) return
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return
    const id = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [currentSession, isOnShift])

  const weeklyData = React.useMemo(
    () => computeWeeklyHours(historySummary),
    [historySummary],
  )

  const weekHours = React.useMemo(
    () => Math.round(weeklyData.reduce((sum, d) => sum + d.hours, 0) * 10) / 10,
    [weeklyData],
  )

  const todayHours = React.useMemo(() => {
    const today = new Date().toDateString()
    const minutes = historySummary
      .filter((s) => new Date(s.actualClockInAt).toDateString() === today)
      .reduce((sum, s) => sum + (s.netMinutes ?? s.grossMinutes ?? 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [historySummary])

  const lastCompletedSession = React.useMemo(() => {
    return [...historySummary]
      .filter((s) => s.actualClockOutAt)
      .sort(
        (a, b) =>
          new Date(b.actualClockOutAt!).getTime() - new Date(a.actualClockOutAt!).getTime(),
      )[0]
  }, [historySummary])

  const nextShift = React.useMemo(() => {
    const now = Date.now()
    return myShifts
      .filter(
        (shift) =>
          (shift.status === ShiftInstanceStatus.SCHEDULED ||
            shift.status === ShiftInstanceStatus.MODIFIED) &&
          new Date(shift.endAt).getTime() >= now,
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]
  }, [myShifts])

  const pendingReviewCount = React.useMemo(
    () => orgSessions.filter(isPendingSession).length,
    [orgSessions],
  )
  const openExceptionCount = exceptions.length
  const teamOnDuty = orgSessions.filter((s) => s.status === WorkSessionStatus.OPEN).length

  const recentEntries = React.useMemo(() => history.data.map(sessionToEntry), [history.data])

  const displayName = user?.firstName || user?.fullName?.split(" ")[0] || "there"
  const greeting = `${greetingForNow()}, ${displayName}`

  const dutySubtitle = isOnShift && currentSession
    ? `Started ${formatTime(currentSession.actualClockInAt)} · ${formatElapsed(currentSession.actualClockInAt, nowMs)} elapsed`
    : lastCompletedSession?.actualClockOutAt
      ? `Last clocked out ${formatDate(lastCompletedSession.actualClockOutAt)} at ${formatTime(lastCompletedSession.actualClockOutAt)}`
      : "Ready when you are"

  const adminTiles = [
    canReadOrgAttendance || canManageShifts
      ? {
          title: "Review queue",
          description: "Approve, reject, or lock work sessions.",
          href: "/reports/review",
          icon: ClipboardCheckIcon,
          count: pendingReviewCount,
          countLabel: "pending",
        }
      : null,
    canReadOrgAttendance || canManageShifts
      ? {
          title: "Exception queue",
          description: "Resolve or dismiss open policy flags.",
          href: "/reports/exception-queue",
          icon: AlertTriangleIcon,
          count: openExceptionCount,
          countLabel: "open",
        }
      : null,
    canManageShifts
      ? {
          title: "Coverage",
          description: "Scan staffing gaps and open shift details.",
          href: "/scheduling",
          icon: CalendarIcon,
          count: null as number | null,
          countLabel: null as string | null,
        }
      : null,
    canManageShifts
      ? {
          title: "Clock-ins",
          description: "Browse attendance captures for a day.",
          href: "/scheduling/clock-ins",
          icon: LogInIcon,
          count: null,
          countLabel: null,
        }
      : null,
    canReadEmployees
      ? {
          title: "Team",
          description: "Employees, invites, and teams.",
          href: "/team",
          icon: UsersIcon,
          count: null,
          countLabel: null,
        }
      : null,
    canReadReports
      ? {
          title: "Hours report",
          description: "Aggregated hours by employee.",
          href: "/reports",
          icon: Clock3Icon,
          count: null,
          countLabel: null,
        }
      : null,
  ].filter(Boolean) as {
    title: string
    description: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    count: number | null
    countLabel: string | null
  }[]

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
            <div className="operations-page-header">
              <div>
                <div className="operations-label">
                  {canUseEmployeeAttendance ? "My shift desk" : "Command center"}
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{greeting}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canUseEmployeeAttendance
                    ? "Clock in, check your next shift, and review recent hours."
                    : "See what needs attention, then jump into review, coverage, or team work."}
                </p>
              </div>
            </div>

            {/* Employee duty strip */}
            {canUseEmployeeAttendance && (
              <Card
                className={cn(
                  "border-primary/25",
                  isOnShift && "border-success/30 bg-success/5",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardDescription className="operations-label">Current shift</CardDescription>
                      <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {isOnShift ? "On duty" : "Off duty"}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{dutySubtitle}</p>
                    </div>
                    {isOnShift && currentSession ? (
                      <div className="rounded-xs border border-border bg-background px-3 py-2 text-right">
                        <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                          Elapsed
                        </div>
                        <div className="text-2xl font-semibold tabular-nums tracking-tight">
                          {formatElapsed(currentSession.actualClockInAt, nowMs)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      size="lg"
                      className="h-12 w-full rounded-xs px-8 text-sm font-medium sm:w-auto"
                      onClick={handleClockButton}
                      variant={isOnShift ? "destructive" : "default"}
                      disabled={actionLoading}
                    >
                      {isOnShift ? (
                        <>
                          <SquareIcon data-icon="inline-start" />
                          {clockOutLoading ? "Clocking out…" : "Clock out"}
                        </>
                      ) : (
                        <>
                          <PlayIcon data-icon="inline-start" />
                          {clockInLoading ? "Clocking in…" : "Clock in"}
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {isOnShift
                        ? "Time is recording. Clock out when your shift ends."
                        : "Start tracking when you begin your shift."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {canUseEmployeeAttendance && (
              <CameraModal
                isOpen={cameraModalOpen}
                onClose={() => {
                  setCameraModalOpen(false)
                  setPendingAction(null)
                }}
                heading={
                  pendingAction === "in"
                    ? "Photo required to clock in"
                    : "Photo required to clock out"
                }
                onCapture={(mediaAssetId) => {
                  setCameraModalOpen(false)
                  if (pendingAction === "in") handleClockIn(mediaAssetId)
                  else handleClockOut(mediaAssetId)
                  setPendingAction(null)
                }}
              />
            )}

            {/* Admin attention strip */}
            {isAdminHome && (canReadOrgAttendance || canManageShifts) && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  to="/reports/review"
                  className="border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="operations-label">Sessions needing approval</div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {pendingReviewCount}
                  </div>
                  <p className="mt-1 text-muted-foreground">Open review queue →</p>
                </Link>
                <Link
                  to="/reports/exception-queue"
                  className="border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="operations-label">Open exceptions</div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {openExceptionCount}
                  </div>
                  <p className="mt-1 text-muted-foreground">Open exception queue →</p>
                </Link>
                <div className="border border-border/70 bg-card p-4">
                  <div className="operations-label">Team on duty</div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {teamOnDuty}
                  </div>
                  <p className="mt-1 text-muted-foreground">Open clock sessions now</p>
                </div>
              </div>
            )}

            {/* Employee today / next shift */}
            {canUseEmployeeAttendance && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="operations-label">Today logged</CardDescription>
                    <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
                      {todayHours.toFixed(1)}h
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {weekHours}h this week · {isOnShift ? "Shift in progress" : "Not on shift"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="operations-label">Next shift</CardDescription>
                    <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
                      {nextShift
                        ? `${shiftDayLabel(nextShift.startAt)} · ${formatTime(nextShift.startAt)}–${formatTime(nextShift.endAt)}`
                        : "No upcoming shift"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <p className="text-muted-foreground">
                      {nextShift?.patternName ?? "Nothing scheduled in the next two weeks."}
                    </p>
                    <Button variant="outline" size="sm" className="shrink-0" asChild>
                      <Link to="/timesheets">Timesheets</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Admin action tiles */}
            {isAdminHome && adminTiles.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {adminTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <Card key={tile.href} className="group">
                      <CardHeader className="pb-2">
                        <CardDescription className="operations-label">
                          {tile.count != null
                            ? `${tile.count} ${tile.countLabel}`
                            : "Shortcut"}
                        </CardDescription>
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                          <Icon className="size-4 text-muted-foreground" />
                          {tile.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-end justify-between gap-3">
                        <p className="text-muted-foreground leading-5">{tile.description}</p>
                        <Button variant="outline" size="sm" className="shrink-0" asChild>
                          <Link to={tile.href}>Open</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Employee week chart */}
            {canUseEmployeeAttendance && (
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="operations-label">Attendance</CardDescription>
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
            )}

            {/* Employee recent entries */}
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
                    <Link to="/timesheets">
                      <FileTextIcon className="size-3.5" />
                      View all
                    </Link>
                  </Button>
                }
              />
            )}

            {/* Admin-only empty: pure employee already has content; pure admin without org read */}
            {!canUseEmployeeAttendance && !isAdminHome && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Welcome</CardTitle>
                  <CardDescription>
                    Your account does not have attendance or operations permissions yet. Contact
                    your organization admin.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Dashboard
