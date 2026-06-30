"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { PlayIcon, SquareIcon } from "lucide-react"

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
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import {
  clockIn,
  clockOut,
  fetchCurrentSession,
  fetchHistory,
} from "@/states/features/attendance.slice"
import { WorkSessionStatus, type WorkSession } from "@/lib/api/attendance.api"
import { showApiErrorToast } from "@/lib/api/errors"

// --- Chart config ---
const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--primary)",
  },
} satisfies ChartConfig

// --- Session-to-row mapping ---
type RecentEntry = {
  id: string
  date: string
  clockIn: string
  clockOut: string | null
  hours: number
  status: "Approved" | "Pending" | "Draft"
}

const statusClassNames: Record<RecentEntry["status"], string> = {
  Approved: "border-success/20 bg-success/10 text-success",
  Pending: "border-warning/25 bg-warning/10 text-warning",
  Draft: "border-border bg-muted text-muted-foreground",
}

function mapSessionStatus(status: WorkSessionStatus): RecentEntry["status"] {
  if (status === WorkSessionStatus.APPROVED || status === WorkSessionStatus.LOCKED) return "Approved"
  if (status === WorkSessionStatus.REJECTED || status === WorkSessionStatus.CANCELLED) return "Draft"
  return "Pending"
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function sessionToEntry(session: WorkSession): RecentEntry {
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

function computeWeeklyHours(sessions: WorkSession[]) {
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
        className={`inline-flex h-6 items-center border px-2 text-xs font-normal uppercase ${statusClassNames[row.original.status]}`}
      >
        {row.original.status}
      </span>
    ),
    meta: { align: "right", width: "8rem" },
  },
]

const Dashboard = () => {
  const dispatch = useAppDispatch()

  const currentSession = useAppSelector((s) => s.attendance.currentSession)
  const history = useAppSelector((s) => s.attendance.history)
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const clockInLoading = useAppSelector((s) => s.attendance.status.clockIn === "loading")
  const clockOutLoading = useAppSelector((s) => s.attendance.status.clockOut === "loading")

  const [recentPagination, setRecentPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 4,
  })

  React.useEffect(() => {
    dispatch(fetchCurrentSession())
    dispatch(fetchHistory())
  }, [dispatch])

  const isOnShift = currentSession?.status === WorkSessionStatus.OPEN

  const handleClockIn = async () => {
    try {
      await dispatch(
        clockIn({
          clientReportedAt: new Date().toISOString(),
          clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientUtcOffsetMinutes: -new Date().getTimezoneOffset(),
        })
      ).unwrap()
      dispatch(fetchCurrentSession())
      dispatch(fetchHistory())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const handleClockOut = async () => {
    try {
      await dispatch(
        clockOut({
          clientReportedAt: new Date().toISOString(),
          clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientUtcOffsetMinutes: -new Date().getTimezoneOffset(),
        })
      ).unwrap()
      dispatch(fetchCurrentSession())
      dispatch(fetchHistory())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  // Derived metrics
  const weeklyData = React.useMemo(() => computeWeeklyHours(history), [history])

  const weekHours = React.useMemo(
    () => Math.round(weeklyData.reduce((sum, d) => sum + d.hours, 0) * 10) / 10,
    [weeklyData]
  )

  const todayHours = React.useMemo(() => {
    const today = new Date().toDateString()
    const minutes = history
      .filter((s) => new Date(s.actualClockInAt).toDateString() === today)
      .reduce((sum, s) => sum + (s.netMinutes ?? s.grossMinutes ?? 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [history])

  const daysWorked = React.useMemo(() => {
    const week = new Set(
      weeklyData.flatMap((d, idx) => (d.hours > 0 ? [idx] : []))
    )
    return week.size
  }, [weeklyData])

  const teamOnDuty = orgSessions.filter((s) => s.status === WorkSessionStatus.OPEN).length

  const allEntries = React.useMemo(
    () => history.map(sessionToEntry),
    [history]
  )

  const paginatedEntries = React.useMemo(() => {
    const start = recentPagination.pageIndex * recentPagination.pageSize
    return allEntries.slice(start, start + recentPagination.pageSize)
  }, [allEntries, recentPagination])

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

  const actionLoading = clockInLoading || clockOutLoading

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
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription className="uppercase tracking-[0.12em] text-xs">
                      Current Shift
                    </CardDescription>
                    <CardTitle className="text-lg font-semibold tracking-tight">
                      {isOnShift ? "On duty" : "Clocked out"}
                    </CardTitle>
                  </div>
                  <div className="text-right text-xs text-muted-foreground tabular-nums">
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
                    onClick={isOnShift ? handleClockOut : handleClockIn}
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

            {/* Metrics grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-[0.12em]">
                      {m.label}
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold tabular-nums tracking-tighter">
                      {m.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Weekly hours chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-[0.12em] text-xs">
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
            <DataTable
              eyebrow="Recent"
              title="Recent entries"
              columns={recentEntryColumns}
              data={paginatedEntries}
              getRowId={(entry) => entry.id}
              pagination={recentPagination}
              onPaginationChange={setRecentPagination}
              rowCount={allEntries.length}
              pageSizeOptions={[4, 8, 12]}
              emptyTitle="No recent entries"
              emptyDescription="Clock in to start a new timesheet entry."
              actions={
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-none" asChild>
                  <a href="#">View all</a>
                </Button>
              }
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Dashboard
