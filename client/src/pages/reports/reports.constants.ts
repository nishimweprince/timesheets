import { formatDateLabel } from "@/lib/format"
import {
  reportsApi,
  type ExceptionReportRow,
  type ExceptionsReportParams,
  type HoursByEmployeeParams,
  type HoursByEmployeeRow,
} from "@/lib/api/reports.api"

/** Which report is shown. Driven by the route. */
export type ReportsTab = "hours" | "exceptions"

/** Sentinel value for the "All …" option in the severity/status selects. */
export const ALL = "__all__"

/** Page size used when paginating the full dataset for PDF export. */
export const REPORT_EXPORT_PAGE_SIZE = 100

/** Minutes rendered as `X.Xh`. */
export function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`
}

/** Local start-of-day ISO timestamp for a date, or undefined. */
export function startOfDayIso(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).toISOString()
}

/** Local end-of-day ISO timestamp for a date, or undefined. */
export function endOfDayIso(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString()
}

/** Human label for a start → end date range, e.g. "All time" or "Jul 1 → Jul 5". */
export function formatRangeLabel(startDate: Date | undefined, endDate: Date | undefined): string {
  if (!startDate && !endDate) return "All time"
  return `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}`
}

/** Fetch every hours-by-employee row across all pages for export. */
export async function fetchAllHoursByEmployee(
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

/** Fetch every exception row across all pages for export. */
export async function fetchAllExceptions(
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
