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

// --- Mock data (realistic for Tuza Health timesheets) ---
const weeklyHours = [
  { day: "Mon", hours: 8.5, target: 8 },
  { day: "Tue", hours: 7.25, target: 8 },
  { day: "Wed", hours: 9.0, target: 8 },
  { day: "Thu", hours: 8.0, target: 8 },
  { day: "Fri", hours: 6.75, target: 8 },
  { day: "Sat", hours: 0, target: 0 },
  { day: "Sun", hours: 0, target: 0 },
]

const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--primary)",
  },
} satisfies ChartConfig

type RecentEntry = {
  id: number
  date: string
  clockIn: string
  clockOut: string | null
  hours: number
  status: "Approved" | "Pending" | "Draft"
}

const recentEntries: RecentEntry[] = [
  { id: 1, date: "Jun 27", clockIn: "07:58", clockOut: "16:32", hours: 8.57, status: "Approved" },
  { id: 2, date: "Jun 26", clockIn: "08:02", clockOut: "15:15", hours: 7.22, status: "Approved" },
  { id: 3, date: "Jun 25", clockIn: "08:15", clockOut: "17:30", hours: 9.25, status: "Approved" },
  { id: 4, date: "Jun 24", clockIn: "07:45", clockOut: null, hours: 8.0, status: "Pending" },
  { id: 5, date: "Jun 23", clockIn: "08:04", clockOut: "16:09", hours: 8.08, status: "Approved" },
  { id: 6, date: "Jun 20", clockIn: "08:21", clockOut: "15:52", hours: 7.52, status: "Draft" },
  { id: 7, date: "Jun 19", clockIn: "07:55", clockOut: "16:11", hours: 8.27, status: "Approved" },
  { id: 8, date: "Jun 18", clockIn: "08:00", clockOut: "16:03", hours: 8.05, status: "Approved" },
  { id: 9, date: "Jun 17", clockIn: "08:12", clockOut: "15:43", hours: 7.52, status: "Pending" },
  { id: 10, date: "Jun 16", clockIn: "07:49", clockOut: "16:20", hours: 8.52, status: "Approved" },
]

const statusClassNames: Record<RecentEntry["status"], string> = {
  Approved: "border-success/20 bg-success/10 text-success",
  Pending: "border-warning/25 bg-warning/10 text-warning",
  Draft: "border-border bg-muted text-muted-foreground",
}

const recentEntryColumns: ColumnDef<RecentEntry>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">{row.original.date}</div>
    ),
    meta: {
      width: "7rem",
    },
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
    meta: {
      align: "right",
      width: "6rem",
    },
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
    meta: {
      align: "right",
      width: "8rem",
    },
  },
]

const Dashboard = () => {
  const [isOnShift, setIsOnShift] = React.useState(false)
  const [shiftStart] = React.useState("08:14")
  const [todayHours, setTodayHours] = React.useState(2.4)
  const [recentPagination, setRecentPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 4,
  })

  const paginatedRecentEntries = React.useMemo(() => {
    const start = recentPagination.pageIndex * recentPagination.pageSize
    return recentEntries.slice(start, start + recentPagination.pageSize)
  }, [recentPagination])

  // Simple mock clock toggle (updates UI state + today hours)
  const toggleShift = () => {
    if (!isOnShift) {
      setIsOnShift(true)
      // simulate time passing while on shift (demo only)
      setTodayHours((h) => Math.round((h + 0.1) * 10) / 10)
    } else {
      setIsOnShift(false)
      // "save" the entry in demo
      setTodayHours((h) => Math.round((h + 0.3) * 10) / 10)
    }
  }

  // Quick metrics (some derived from mocks)
  const metrics = [
    { label: "Hours this week", value: "31.5", sub: "of 40 target" },
    { label: "Today logged", value: todayHours.toFixed(1), sub: isOnShift ? "On shift" : "Complete" },
    { label: "Days worked", value: "4", sub: "this week" },
    { label: "Team on duty", value: "12", sub: "across wards" },
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
            {/* Signature element: Prominent Clock In / Out */}
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
                    {isOnShift ? `Started ${shiftStart}` : "Last shift ended today"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    className="h-11 rounded-none px-8 text-sm font-medium"
                    onClick={toggleShift}
                    variant={isOnShift ? "destructive" : "default"}
                  >
                    {isOnShift ? (
                      <>
                        <SquareIcon data-icon="inline-start" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <PlayIcon data-icon="inline-start" />
                        Clock In
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
                    data={weeklyHours}
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
              data={paginatedRecentEntries}
              getRowId={(entry) => String(entry.id)}
              pagination={recentPagination}
              onPaginationChange={setRecentPagination}
              rowCount={recentEntries.length}
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
