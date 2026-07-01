"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { AlertTriangleIcon, ClockIcon, DownloadIcon, UsersIcon } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import Modal from "@/components/reusable/cards/Modal"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import Select from "@/components/reusable/inputs/Select"
import { DataTable } from "@/components/reusable/tables"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { showApiErrorToast } from "@/lib/api/errors"
import {
  reportsApi,
  type ExceptionReportRow,
  type ExceptionsReportParams,
  type HoursByEmployeeParams,
  type HoursByEmployeeRow,
} from "@/lib/api/reports.api"
import { cn } from "@/lib/utils"
import { fetchExceptionsReport, fetchHoursByEmployee } from "@/states/features/reports.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

type Tab = "hours" | "exceptions"

const ALL = "__all__"
const REPORT_EXPORT_PAGE_SIZE = 100

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

function formatDateLabel(date: Date | undefined): string {
  return date
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—"
}

function formatRangeLabel(startDate: Date | undefined, endDate: Date | undefined): string {
  if (!startDate && !endDate) return "All time"
  return `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}`
}

async function fetchAllHoursByEmployee(
  params: Omit<HoursByEmployeeParams, "page" | "pageSize">,
): Promise<HoursByEmployeeRow[]> {
  const rows: HoursByEmployeeRow[] = []
  let page = 1

  while (true) {
    const result = await reportsApi.hoursByEmployee({
      ...params,
      page,
      pageSize: REPORT_EXPORT_PAGE_SIZE,
    })
    rows.push(...result.data)

    if (result.data.length === 0 || rows.length >= result.total) break
    page += 1
  }

  return rows
}

async function fetchAllExceptions(
  params: Omit<ExceptionsReportParams, "page" | "pageSize">,
): Promise<ExceptionReportRow[]> {
  const rows: ExceptionReportRow[] = []
  let page = 1

  while (true) {
    const result = await reportsApi.exceptions({
      ...params,
      page,
      pageSize: REPORT_EXPORT_PAGE_SIZE,
    })
    rows.push(...result.data)

    if (result.data.length === 0 || rows.length >= result.total) break
    page += 1
  }

  return rows
}

const Reports = () => {
  const dispatch = useAppDispatch()
  const hoursPage = useAppSelector((state) => state.reports.hoursByEmployee)
  const exceptionsPage = useAppSelector((state) => state.reports.exceptions)
  const status = useAppSelector((state) => state.reports.status)

  const [activeTab, setActiveTab] = React.useState<Tab>("hours")
  const [hoursDay, setHoursDay] = React.useState<Date>(() => new Date())
  const [reportModalOpen, setReportModalOpen] = React.useState(false)
  const [reportStartDate, setReportStartDate] = React.useState<Date | undefined>(() => new Date())
  const [reportEndDate, setReportEndDate] = React.useState<Date | undefined>(() => new Date())
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false)
  const [severity, setSeverity] = React.useState<string>(ALL)
  const [exceptionStatus, setExceptionStatus] = React.useState<string>(ALL)

  const [hoursPagination, setHoursPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [exceptionsPagination, setExceptionsPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const hoursDateParams = React.useMemo(
    () => ({ startDate: startOfDayIso(hoursDay), endDate: endOfDayIso(hoursDay) }),
    [hoursDay],
  )

  React.useEffect(() => {
    dispatch(
      fetchHoursByEmployee({
        page: hoursPagination.pageIndex + 1,
        pageSize: hoursPagination.pageSize,
        ...hoursDateParams,
      }),
    )
  }, [dispatch, hoursPagination.pageIndex, hoursPagination.pageSize, hoursDateParams])

  React.useEffect(() => {
    dispatch(
      fetchExceptionsReport({
        page: exceptionsPagination.pageIndex + 1,
        pageSize: exceptionsPagination.pageSize,
        severity: severity === ALL ? undefined : severity,
        status: exceptionStatus === ALL ? undefined : exceptionStatus,
      }),
    )
  }, [dispatch, exceptionsPagination.pageIndex, exceptionsPagination.pageSize, severity, exceptionStatus])

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

  const hoursDayLabel = React.useMemo(() => formatDateLabel(hoursDay), [hoursDay])

  const hoursColumns = React.useMemo<ColumnDef<HoursByEmployeeRow>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{employeeName(row.original)}</span>
            {row.original.jobTitle ? (
              <span className="text-[13px] leading-5 text-muted-foreground">{row.original.jobTitle}</span>
            ) : null}
          </div>
        ),
        meta: { width: "16rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "employeeNumber",
        header: "Emp. no.",
        cell: ({ row }) => <span className="text-[13px] text-muted-foreground">{row.original.employeeNumber ?? "—"}</span>,
        meta: { width: "120px", cellClassName: "py-3" },
      },
      {
        accessorKey: "sessionCount",
        header: "Sessions",
        cell: ({ row }) => <span className="tabular-nums">{row.original.sessionCount}</span>,
        meta: { align: "right", width: "108px", cellClassName: "py-3" },
      },
      {
        accessorKey: "netMinutes",
        header: "Net hours",
        cell: ({ row }) => <span className="tabular-nums font-medium">{formatHours(row.original.netMinutes)}</span>,
        meta: { align: "right", width: "120px", cellClassName: "py-3" },
      },
      {
        accessorKey: "grossMinutes",
        header: "Gross hours",
        cell: ({ row }) => <span className="tabular-nums">{formatHours(row.original.grossMinutes)}</span>,
        meta: { align: "right", width: "120px", cellClassName: "py-3" },
      },
      {
        accessorKey: "breakMinutes",
        header: "Breaks",
        cell: ({ row }) => <span className="tabular-nums">{formatHours(row.original.breakMinutes)}</span>,
        meta: { align: "right", width: "108px", cellClassName: "py-3" },
      },
      {
        accessorKey: "exceptionCount",
        header: "Exceptions",
        cell: ({ row }) => <span className="tabular-nums">{row.original.exceptionCount}</span>,
        meta: { align: "right", width: "120px", cellClassName: "py-3" },
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
        meta: { width: "16rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <span className="font-mono text-[13px] leading-5">{row.original.code}</span>,
        meta: { width: "170px", cellClassName: "py-3" },
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <span className="inline-flex items-center border border-border/70 px-2 py-0.5 text-[13px] capitalize text-muted-foreground">
            {row.original.severity}
          </span>
        ),
        meta: { width: "120px", cellClassName: "py-3" },
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => <span className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{row.original.message}</span>,
        meta: { width: "24rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <span className="capitalize">{row.original.status.toLowerCase()}</span>,
        meta: { width: "120px", cellClassName: "py-3" },
      },
      {
        accessorKey: "createdAt",
        header: "Logged",
        cell: ({ row }) => <span className="text-[13px] leading-5 text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
        meta: { width: "190px", cellClassName: "py-3" },
      },
    ],
    [],
  )

  const openReportModal = () => {
    const defaultDate = activeTab === "hours" ? hoursDay : new Date()
    setReportStartDate(defaultDate)
    setReportEndDate(defaultDate)
    setReportModalOpen(true)
  }

  const generateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast.error("Select a start and end date")
      return
    }

    const reportStartTime = new Date(
      reportStartDate.getFullYear(),
      reportStartDate.getMonth(),
      reportStartDate.getDate(),
    ).getTime()
    const reportEndTime = new Date(
      reportEndDate.getFullYear(),
      reportEndDate.getMonth(),
      reportEndDate.getDate(),
    ).getTime()

    if (reportStartTime > reportEndTime) {
      toast.error("Start date must be before end date")
      return
    }

    setIsGeneratingReport(true)

    try {
      const doc = new jsPDF({ orientation: "landscape" })
      const generatedAt = new Date().toLocaleString()
      const rangeLabel = formatRangeLabel(reportStartDate, reportEndDate)
      const startDate = startOfDayIso(reportStartDate)
      const endDate = endOfDayIso(reportEndDate)

      if (activeTab === "hours") {
        const reportRows = await fetchAllHoursByEmployee({
          startDate,
          endDate,
        })

        if (reportRows.length === 0) {
          toast.error("No hours found for selected range")
          return
        }

        doc.setFontSize(14)
        doc.text("Hours by employee", 14, 16)
        doc.setFontSize(9)
        doc.text(`Range: ${rangeLabel}   ·   Generated: ${generatedAt}`, 14, 22)
        autoTable(doc, {
          startY: 28,
          head: [["Employee", "Emp. no.", "Job title", "Sessions", "Net hours", "Gross hours", "Breaks", "Exceptions"]],
          body: reportRows.map((row) => [
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
        const reportRows = await fetchAllExceptions({
          severity: severity === ALL ? undefined : severity,
          status: exceptionStatus === ALL ? undefined : exceptionStatus,
          startDate,
          endDate,
        })

        if (reportRows.length === 0) {
          toast.error("No exceptions found for selected range")
          return
        }

        doc.setFontSize(14)
        doc.text("Attendance exceptions", 14, 16)
        doc.setFontSize(9)
        doc.text(`Range: ${rangeLabel}   ·   Generated: ${generatedAt}`, 14, 22)
        autoTable(doc, {
          startY: 28,
          head: [["Employee", "Code", "Severity", "Message", "Status", "Logged"]],
          body: reportRows.map((row) => [
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
      setReportModalOpen(false)
      toast.success("Report exported")
    } catch (err) {
      showApiErrorToast(err)
    } finally {
      setIsGeneratingReport(false)
    }
  }

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
                description={`${hoursPage.total} total on selected day`}
                icon={UsersIcon}
              />
              <SummaryCard
                label="Net hours on page"
                value={formatHours(totalNetMinutes)}
                description={hoursDayLabel}
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
                {activeTab === "exceptions" ? (
                  <>
                    <Select
                      value={severity}
                      options={severityOptions}
                      onChange={(value) => setSeverity(value)}
                      className="w-48"
                    />
                    <Select
                      value={exceptionStatus}
                      options={statusOptions}
                      onChange={(value) => setExceptionStatus(value)}
                      className="w-48"
                    />
                  </>
                ) : (
                  <div className="w-48">
                    <DatePicker
                      value={hoursDay}
                      onChange={(date) => {
                        if (!date) return
                        setHoursDay(date)
                        setHoursPagination((current) => ({ ...current, pageIndex: 0 }))
                      }}
                      placeholder="Select day"
                    />
                  </div>
                )}
                <Button type="button" variant="outline" onClick={openReportModal}>
                  <DownloadIcon className="size-4" />
                  Generate report
                </Button>
              </div>
            </div>

            <Modal
              isOpen={reportModalOpen}
              onClose={() => setReportModalOpen(false)}
              heading="Generate report"
              className="!min-w-0 w-[min(92vw,34rem)] rounded-none"
              headingClassName="text-base normal-case tracking-tight text-foreground"
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Start date
                    </span>
                    <DatePicker
                      value={reportStartDate}
                      onChange={setReportStartDate}
                      placeholder="Start date"
                      toDate={reportEndDate}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      End date
                    </span>
                    <DatePicker
                      value={reportEndDate}
                      onChange={setReportEndDate}
                      placeholder="End date"
                      fromDate={reportStartDate}
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => setReportModalOpen(false)}
                    disabled={isGeneratingReport}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none"
                    onClick={generateReport}
                    disabled={isGeneratingReport}
                  >
                    <DownloadIcon className="size-4" />
                    {isGeneratingReport ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            </Modal>

            {activeTab === "hours" ? (
              <DataTable
                eyebrow="Hours"
                title="Hours by employee"
                description={`Aggregated net, gross, and break hours per employee for ${hoursDayLabel}.`}
                columns={hoursColumns}
                data={hoursPage.data}
                tableClassName="min-w-[900px]"
                getRowId={(row) => row.membershipId}
                pagination={hoursPagination}
                paginationInfo={hoursPage}
                onPaginationChange={setHoursPagination}
                rowCount={hoursPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.hoursByEmployee === "loading" && hoursPage.data.length === 0}
                isFetching={status.hoursByEmployee === "loading" && hoursPage.data.length > 0}
                emptyTitle="No attendance on selected day"
                emptyDescription="Select a different day to see hours worked per employee."
              />
            ) : (
              <DataTable
                eyebrow="Exceptions"
                title="Attendance exceptions"
                description="Policy exceptions flagged on work sessions for the selected filters."
                columns={exceptionColumns}
                data={exceptionsPage.data}
                tableClassName="min-w-[980px]"
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
