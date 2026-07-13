import type { ColumnDef } from "@tanstack/react-table"

import StatusBadge from "@/components/reusable/badges/StatusBadge"
import { employeeName, formatDateTime } from "@/lib/format"
import {
  type ExceptionReportRow,
  type HoursByEmployeeRow,
} from "@/lib/api/reports.api"

import { formatHours } from "./reports.constants"

/** Columns for the hours-by-employee table. */
export function buildHoursColumns(): ColumnDef<HoursByEmployeeRow>[] {
  return [
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {employeeName(row.original) || "Unknown employee"}
          </span>
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
  ]
}

/** Columns for the attendance-exceptions table. */
export function buildExceptionColumns(): ColumnDef<ExceptionReportRow>[] {
  return [
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {employeeName(row.original) || "Unknown employee"}
        </span>
      ),
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
        <StatusBadge
          status={row.original.severity}
          toneMap={{ LOW: "outline", MEDIUM: "warning", HIGH: "destructive", CRITICAL: "destructive" }}
          uppercase={false}
          className="h-auto py-0.5 text-[13px] capitalize"
        />
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
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          toneMap={{ OPEN: "warning", RESOLVED: "success", DISMISSED: "muted" }}
          uppercase={false}
          className="capitalize"
        />
      ),
      meta: { width: "120px", cellClassName: "py-3" },
    },
    {
      accessorKey: "createdAt",
      header: "Logged",
      cell: ({ row }) => <span className="text-[13px] leading-5 text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      meta: { width: "190px", cellClassName: "py-3" },
    },
  ]
}
