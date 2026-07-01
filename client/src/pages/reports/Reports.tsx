"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { AlertTriangleIcon, ClockIcon, DownloadIcon, UsersIcon } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import Select from "@/components/reusable/inputs/Select"
import { DataTable } from "@/components/reusable/tables"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { showApiErrorToast } from "@/lib/api/errors"
import type { ExceptionReportRow, HoursByEmployeeRow } from "@/lib/api/reports.api"
import { cn } from "@/lib/utils"
import { fetchExceptionsReport, fetchHoursByEmployee } from "@/states/features/reports.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

type Tab = "hours" | "exceptions"

const ALL = "__all__"

function employeeName(row: { firstName: string | null; lastName: string | null }): string {
  const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim()
  return name || "Unknown employee"
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function startOfDayIso(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).toISOString()
}

function endOfDayIso(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString()
}

const Reports = () => {
  const dispatch = useAppDispatch()
  const hoursPage = useAppSelector((state) => state.reports.hoursByEmployee)
  const exceptionsPage = useAppSelector((state) => state.reports.exceptions)
  const status = useAppSelector((state) => state.reports.status)

  const [activeTab, setActiveTab] = React.useState<Tab>("hours")
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [severity, setSeverity] = React.useState<string>(ALL)
  const [exceptionStatus, setExceptionStatus] = React.useState<string>(ALL)

  const [hoursPagination, setHoursPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [exceptionsPagination, setExceptionsPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const dateParams = React.useMemo(
    () => ({ startDate: startOfDayIso(startDate), endDate: endOfDayIso(endDate) }),
    [startDate, endDate],
  )

  React.useEffect(() => {
    dispatch(
      fetchHoursByEmployee({
        page: hoursPagination.pageIndex + 1,
        pageSize: hoursPagination.pageSize,
        ...dateParams,
      }),
    )
  }, [dispatch, hoursPagination.pageIndex, hoursPagination.pageSize, dateParams])

  React.useEffect(() => {
    dispatch(
      fetchExceptionsReport({
        page: exceptionsPagination.pageIndex + 1,
        pageSize: exceptionsPagination.pageSize,
        severity: severity === ALL ? undefined : severity,
        status: exceptionStatus === ALL ? undefined : exceptionStatus,
        ...dateParams,
      }),
    )
  }, [dispatch, exceptionsPagination.pageIndex, exceptionsPagination.pageSize, severity, exceptionStatus, dateParams])

  const severityOptions = React.useMemo(() => {
    const distinct = Array.from(new Set(exceptionsPage.data.map((row) => row.severity))).filter(Boolean)
    return [{ label: "All severities", value: ALL }, ...distinct.map((value) => ({ label: value, value }))]
  }, [exceptionsPage.data])

  const statusOptions = React.useMemo(() => {
    const distinct = Array.from(new Set(exceptionsPage.data.map((row) => row.status))).filter(Boolean)
    return [{ label: "All statuses", value: ALL }, ...distinct.map((value) => ({ label: value, value }))]
  }, [exceptionsPage.data])

  const totalNetMinutes = React.useMemo(
    () => hoursPage.data.reduce((sum, row) => sum + row.netMinutes, 0),
    [hoursPage.data],
  )
  const totalExceptionsOnPage = React.useMemo(
    () => hoursPage.data.reduce((sum, row) => sum + row.exceptionCount, 0),
    [hoursPage.data],
  )

  const rangeLabel = React.useMemo(() => {
    if (!startDate && !endDate) return "All time"
    const fmt = (d?: Date) => (d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "…")
    return `${fmt(startDate)} → ${fmt(endDate)}`
  }, [startDate, endDate])

  const hoursColumns = React.useMemo<ColumnDef<HoursByEmployeeRow>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{employeeName(row.original)}</span>
            {row.original.jobTitle ? (
              <span className="text-xs text-muted-foreground">{row.original.jobTitle}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "employeeNumber",
        header: "Emp. no.",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.employeeNumber ?? "—"}</span>,
        meta: { width: "110px" },
      },
      {
        accessorKey: "sessionCount",
        header: "Sessions",
        cell: ({ row }) => <span className="tabular-nums">{row.original.sessionCount}</span>,
        meta: { align: "right", width: "100px" },
      },
      {
        accessorKey: "netMinutes",
        header: "Net hours",
        cell: ({ row }) => <span className="tabular-nums font-medium">{formatHours(row.original.netMinutes)}</span>,
        meta: { align: "right", width: "110px" },
      },
      {
        accessorKey: "grossMinutes",
        header: "Gross hours",
        cell: ({ row }) => <span className="tabular-nums">{formatHours(row.original.grossMinutes)}</span>,
        meta: { align: "right", width: "110px" },
      },
      {
        accessorKey: "breakMinutes",
        header: "Breaks",
        cell: ({ row }) => <span className="tabular-nums">{formatHours(row.original.breakMinutes)}</span>,
        meta: { align: "right", width: "100px" },
      },
      {
        accessorKey: "exceptionCount",
        header: "Exceptions",
        cell: ({ row }) => <span className="tabular-nums">{row.original.exceptionCount}</span>,
        meta: { align: "right", width: "110px" },
      },
    ],
    [],
  )

  const exceptionColumns = React.useMemo<ColumnDef<ExceptionReportRow>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => <span className="font-medium text-foreground">{employeeName(row.original)}</span>,
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
        meta: { width: "160px" },
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <span className="inline-flex items-center border border-border/70 px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {row.original.severity}
          </span>
        ),
        meta: { width: "110px" },
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.message}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <span className="capitalize">{row.original.status.toLowerCase()}</span>,
        meta: { width: "110px" },
      },
      {
        accessorKey: "createdAt",
        header: "Logged",
        cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
        meta: { width: "180px" },
      },
    ],
    [],
  )

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" })
      const generatedAt = new Date().toLocaleString()

      if (activeTab === "hours") {
        doc.setFontSize(14)
        doc.text("Hours by employee", 14, 16)
        doc.setFontSize(9)
        doc.text(`Range: ${rangeLabel}   ·   Generated: ${generatedAt}`, 14, 22)
        autoTable(doc, {
          startY: 28,
          head: [["Employee", "Emp. no.", "Job title", "Sessions", "Net hours", "Gross hours", "Breaks", "Exceptions"]],
          body: hoursPage.data.map((row) => [
            employeeName(row),
            row.employeeNumber ?? "—",
            row.jobTitle ?? "—",
            String(row.sessionCount),
            formatHours(row.netMinutes),
            formatHours(row.grossMinutes),
            formatHours(row.breakMinutes),
            String(row.exceptionCount),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 30, 30] },
        })
        doc.save(`hours-by-employee-${Date.now()}.pdf`)
      } else {
        doc.setFontSize(14)
        doc.text("Attendance exceptions", 14, 16)
        doc.setFontSize(9)
        doc.text(`Range: ${rangeLabel}   ·   Generated: ${generatedAt}`, 14, 22)
        autoTable(doc, {
          startY: 28,
          head: [["Employee", "Code", "Severity", "Message", "Status", "Logged"]],
          body: exceptionsPage.data.map((row) => [
            employeeName(row),
            row.code,
            row.severity,
            row.message,
            row.status,
            formatDateTime(row.createdAt),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 30, 30] },
        })
        doc.save(`attendance-exceptions-${Date.now()}.pdf`)
      }
      toast.success("Report exported")
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const activeData = activeTab === "hours" ? hoursPage.data : exceptionsPage.data

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
            <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
              <p className="text-sm text-muted-foreground">Analytics</p>
              <h1 className="text-[13px] font-semibold tracking-tight text-foreground">Reports</h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Employees on page"
                value={String(hoursPage.data.length)}
                description={`${hoursPage.total} total in range`}
                icon={UsersIcon}
              />
              <SummaryCard
                label="Net hours on page"
                value={formatHours(totalNetMinutes)}
                description={rangeLabel}
                icon={ClockIcon}
              />
              <SummaryCard
                label="Exceptions"
                value={String(exceptionsPage.total)}
                description={`${totalExceptionsOnPage} flagged on hours page`}
                icon={AlertTriangleIcon}
              />
            </div>

            <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-1">
                {(["hours", "exceptions"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative h-9 px-4 text-[13px] transition-colors",
                      activeTab === tab
                        ? "border-b-2 border-primary font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab === "hours" ? "Hours by employee" : "Exceptions"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2 pb-3 sm:pb-2">
                <div className="w-40">
                  <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" toDate={endDate} />
                </div>
                <div className="w-40">
                  <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" fromDate={startDate} />
                </div>
                {activeTab === "exceptions" ? (
                  <>
                    <Select
                      value={severity}
                      options={severityOptions}
                      onChange={(value) => setSeverity(value)}
                      className="h-10 w-36"
                    />
                    <Select
                      value={exceptionStatus}
                      options={statusOptions}
                      onChange={(value) => setExceptionStatus(value)}
                      className="h-10 w-36"
                    />
                  </>
                ) : null}
                <Button type="button" variant="outline" onClick={exportPdf} disabled={activeData.length === 0}>
                  <DownloadIcon className="mr-2 size-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            {activeTab === "hours" ? (
              <DataTable
                eyebrow="Hours"
                title="Hours by employee"
                description="Aggregated net, gross, and break hours per employee over the selected range."
                columns={hoursColumns}
                data={hoursPage.data}
                getRowId={(row) => row.membershipId}
                pagination={hoursPagination}
                paginationInfo={hoursPage}
                onPaginationChange={setHoursPagination}
                rowCount={hoursPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.hoursByEmployee === "loading" && hoursPage.data.length === 0}
                isFetching={status.hoursByEmployee === "loading" && hoursPage.data.length > 0}
                emptyTitle="No attendance in range"
                emptyDescription="Adjust the date range to see hours worked per employee."
              />
            ) : (
              <DataTable
                eyebrow="Exceptions"
                title="Attendance exceptions"
                description="Policy exceptions flagged on work sessions over the selected range."
                columns={exceptionColumns}
                data={exceptionsPage.data}
                getRowId={(row) => row.id}
                pagination={exceptionsPagination}
                paginationInfo={exceptionsPage}
                onPaginationChange={setExceptionsPagination}
                rowCount={exceptionsPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.exceptions === "loading" && exceptionsPage.data.length === 0}
                isFetching={status.exceptions === "loading" && exceptionsPage.data.length > 0}
                emptyTitle="No exceptions in range"
                emptyDescription="No policy exceptions were logged for the selected filters."
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-sm text-muted-foreground">{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tighter tabular-nums">
          <Icon className="size-4 text-muted-foreground" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default Reports
