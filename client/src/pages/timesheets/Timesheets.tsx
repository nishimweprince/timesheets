"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchHistory } from "@/states/features/attendance.slice"
import {
  formatDate,
  sessionToEntry,
  statusClassNames,
  type RecentEntry,
} from "@/lib/attendance.utils"

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
        className={`inline-flex h-6 items-center border px-2 text-xs font-normal uppercase ${statusClassNames[row.original.status]}`}
      >
        {row.original.status}
      </span>
    ),
    meta: { align: "right", width: "8rem" },
  },
]

type StatusFilter = "All" | "Approved" | "Pending" | "Draft"

const Timesheets = () => {
  const dispatch = useAppDispatch()

  const history = useAppSelector((s) => s.attendance.history)
  const isLoading = useAppSelector((s) => s.attendance.status.history === "loading")

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
    dispatch(fetchHistory())
  }, [dispatch])

  const allEntries = React.useMemo(() => history.map(sessionToEntry), [history])

  const filteredEntries = React.useMemo(() => {
    if (statusFilter === "All") return allEntries
    return allEntries.filter((e) => e.status === statusFilter)
  }, [allEntries, statusFilter])

  const paginatedEntries = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filteredEntries.slice(start, start + pagination.pageSize)
  }, [filteredEntries, pagination])

  const totalHours = React.useMemo(
    () =>
      Math.round(
        history.reduce((sum, s) => sum + ((s.netMinutes ?? s.grossMinutes ?? 0) / 60), 0) * 10
      ) / 10,
    [history]
  )

  const daysWorked = React.useMemo(
    () => new Set(history.map((s) => formatDate(s.actualClockInAt))).size,
    [history]
  )

  const pendingCount = React.useMemo(
    () => allEntries.filter((e) => e.status === "Pending").length,
    [allEntries]
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
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {summaryCards.map((m, idx) => (
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

            {/* History table */}
            <DataTable
              eyebrow="Attendance"
              title="My timesheets"
              columns={columns}
              data={paginatedEntries}
              getRowId={(entry) => entry.id}
              pagination={pagination}
              onPaginationChange={setPagination}
              rowCount={filteredEntries.length}
              pageSizeOptions={[8, 16, 32]}
              isLoading={isLoading}
              emptyTitle="No timesheet entries"
              emptyDescription="Clock in to start recording your attendance."
              toolbar={
                <Select
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger className="h-8 w-36 rounded-none text-xs">
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
