import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import { AlertTriangleIcon, ClockIcon, UsersIcon } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

import { employeeName, formatDateLabel, formatDateTime } from "@/lib/format"
import { showApiErrorToast } from "@/lib/api/errors"
import { fetchExceptionsReport, fetchHoursByEmployee } from "@/states/features/reports.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

import { buildExceptionColumns, buildHoursColumns } from "./reports.columns"
import {
  ALL,
  fetchAllExceptions,
  fetchAllHoursByEmployee,
  formatHours,
  formatRangeLabel,
  startOfDayIso,
  endOfDayIso,
  type ReportsTab,
} from "./reports.constants"

type SummaryCard = {
  label: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Container logic for the reports page: data fetching, filters, pagination,
 * derived summaries, table columns, and the PDF export flow. Keeping this in a
 * hook lets `Reports.tsx` stay a thin presentational shell.
 */
export function useReports(tab: ReportsTab) {
  const dispatch = useAppDispatch()
  const hoursPage = useAppSelector((state) => state.reports.hoursByEmployee)
  const exceptionsPage = useAppSelector((state) => state.reports.exceptions)
  const status = useAppSelector((state) => state.reports.status)

  const activeTab = tab
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

  const hoursColumns = React.useMemo(() => buildHoursColumns(), [])
  const exceptionColumns = React.useMemo(() => buildExceptionColumns(), [])

  const summaryCards = React.useMemo<SummaryCard[]>(
    () => [
      {
        label: "Employees on page",
        value: String(hoursPage.data.length),
        description: `${hoursPage.total} total on selected day`,
        icon: UsersIcon,
      },
      {
        label: "Net hours on page",
        value: formatHours(totalNetMinutes),
        description: hoursDayLabel,
        icon: ClockIcon,
      },
      {
        label: "Exceptions",
        value: String(exceptionsPage.total),
        description: `${totalExceptionsOnPage} flagged on hours page`,
        icon: AlertTriangleIcon,
      },
    ],
    [hoursPage.data.length, hoursPage.total, totalNetMinutes, hoursDayLabel, exceptionsPage.total, totalExceptionsOnPage],
  )

  const onHoursDayChange = React.useCallback((date: Date | undefined) => {
    if (!date) return
    setHoursDay(date)
    setHoursPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [])

  const openReportModal = React.useCallback(() => {
    const defaultDate = activeTab === "hours" ? hoursDay : new Date()
    setReportStartDate(defaultDate)
    setReportEndDate(defaultDate)
    setReportModalOpen(true)
  }, [activeTab, hoursDay])

  const closeReportModal = React.useCallback(() => setReportModalOpen(false), [])

  const generateReport = React.useCallback(async () => {
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
            employeeName(row) || "Unknown employee",
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
            employeeName(row) || "Unknown employee",
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
  }, [activeTab, exceptionStatus, reportEndDate, reportStartDate, severity])

  return {
    // page data
    activeTab,
    hoursPage,
    exceptionsPage,
    status,
    summaryCards,
    // hours filter
    hoursDay,
    onHoursDayChange,
    hoursDayLabel,
    // exception filters
    severity,
    setSeverity,
    severityOptions,
    exceptionStatus,
    setExceptionStatus,
    statusOptions,
    // columns
    hoursColumns,
    exceptionColumns,
    // pagination
    hoursPagination,
    setHoursPagination,
    exceptionsPagination,
    setExceptionsPagination,
    // report export modal
    reportModalOpen,
    openReportModal,
    closeReportModal,
    reportStartDate,
    setReportStartDate,
    reportEndDate,
    setReportEndDate,
    isGeneratingReport,
    generateReport,
  }
}
