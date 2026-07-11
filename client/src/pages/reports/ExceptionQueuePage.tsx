"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useNavigate, useSearchParams } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import Select from "@/components/reusable/inputs/Select"
import { DataTable } from "@/components/reusable/tables"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  AttendanceExceptionStatus,
  type AttendanceException,
} from "@/lib/api/attendance.api"
import { fetchExceptions } from "@/states/features/attendance.slice"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

function shortId(id: string) {
  return id.slice(0, 8)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function employeeName(employee: { firstName: string; lastName: string; email: string }) {
  const name = `${employee.firstName} ${employee.lastName}`.trim()
  return name || employee.email
}

const STATUS_OPTIONS = [
  { label: "Open", value: AttendanceExceptionStatus.OPEN },
  { label: "Resolved", value: AttendanceExceptionStatus.RESOLVED },
  { label: "Dismissed", value: AttendanceExceptionStatus.DISMISSED },
  { label: "All statuses", value: "ALL" },
]

const SEVERITY_OPTIONS = [
  { label: "All severities", value: "__all__" },
  { label: "Warning", value: "WARNING" },
  { label: "Error", value: "ERROR" },
  { label: "Info", value: "INFO" },
]

const ExceptionQueuePage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const statusExceptions = useAppSelector((s) => s.attendance.status.exceptions)
  const employees = useAppSelector((s) => s.employeeManagement.employees)

  const statusFilter = searchParams.get("status") ?? AttendanceExceptionStatus.OPEN
  const severityFilter = searchParams.get("severity") ?? "__all__"

  React.useEffect(() => {
    dispatch(fetchEmployees())
  }, [dispatch])

  React.useEffect(() => {
    dispatch(
      fetchExceptions({
        status: statusFilter as AttendanceExceptionStatus | "ALL",
        ...(severityFilter !== "__all__" ? { severity: severityFilter } : {}),
      }),
    )
  }, [dispatch, statusFilter, severityFilter])

  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])

  const columns: ColumnDef<AttendanceException>[] = React.useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => {
          const name =
            employeeByMembershipId.get(row.original.employeeMembershipId) ??
            shortId(row.original.employeeMembershipId)
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-medium">{name}</span>
              <span className="font-mono text-[12px] text-muted-foreground">
                {shortId(row.original.employeeMembershipId)}
              </span>
            </div>
          )
        },
        meta: { width: "13rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px]">{getValue<string>()}</span>
        ),
        meta: { width: "11rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ getValue }) => (
          <span className="text-[12px] uppercase text-muted-foreground">{getValue<string>()}</span>
        ),
        meta: { width: "7rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <span className="inline-flex h-6 items-center border border-border px-2 text-[12px] uppercase text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ getValue }) => (
          <span className="line-clamp-2 text-[13px] text-muted-foreground">{getValue<string>()}</span>
        ),
        meta: { cellClassName: "py-3" },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-[13px]">{formatDateTime(getValue<string>())}</span>
        ),
        meta: { width: "11rem", cellClassName: "py-3" },
      },
    ],
    [employeeByMembershipId],
  )

  const isLoading = statusExceptions === "loading" && exceptions.length === 0
  const isFetching = statusExceptions === "loading" && exceptions.length > 0

  const setFilter = (key: "status" | "severity", value: string) => {
    const next = new URLSearchParams(searchParams)
    if (key === "status") {
      if (value === AttendanceExceptionStatus.OPEN) next.delete("status")
      else next.set("status", value)
    } else {
      if (value === "__all__") next.delete("severity")
      else next.set("severity", value)
    }
    setSearchParams(next, { replace: true })
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
            <div className="operations-page-header">
              <div>
                <div className="operations-label">Attendance</div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Exception queue
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review open policy flags and resolve or dismiss them. Analytics export stays under
                  Reports → Exceptions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
              <div className="w-48">
                <Select
                  label="Status"
                  value={statusFilter}
                  options={STATUS_OPTIONS}
                  onChange={(value) => setFilter("status", value)}
                />
              </div>
              <div className="w-48">
                <Select
                  label="Severity"
                  value={severityFilter}
                  options={SEVERITY_OPTIONS}
                  onChange={(value) => setFilter("severity", value)}
                />
              </div>
            </div>

            <DataTable
              eyebrow="Exceptions"
              title="Policy exceptions"
              description="Operational queue for attendance policy flags. Open a row for detail and actions."
              columns={columns}
              data={exceptions}
              tableClassName="min-w-[900px]"
              getRowId={(row) => row.id}
              onRowClick={(row) => {
                const search = searchParams.toString()
                navigate({
                  pathname: `/reports/exception-queue/${row.original.id}`,
                  search: search ? `?${search}` : "",
                })
              }}
              hidePagination
              isLoading={isLoading}
              isFetching={isFetching}
              emptyTitle="No exceptions"
              emptyDescription="No exceptions match the selected filters."
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ExceptionQueuePage
