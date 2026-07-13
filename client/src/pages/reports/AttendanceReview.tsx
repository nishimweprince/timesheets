"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { CheckCircle2Icon, LockIcon, XCircleIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import StatusBadge from "@/components/reusable/badges/StatusBadge"
import ConfirmationModal from "@/components/reusable/cards/ConfirmationModal"
import { PageHeader } from "@/components/reusable/layout"
import { DataTable } from "@/components/reusable/tables"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  WorkSessionStatus,
  type WorkSession,
} from "@/lib/api/attendance.api"
import { showApiErrorToast } from "@/lib/api/errors"
import { employeeName, formatDateTime, shortId } from "@/lib/format"
import {
  approveSession,
  closeSessionReviewConfirm,
  fetchExceptions,
  fetchOrgSessions,
  lockSession,
  openSessionReviewConfirm,
  rejectSession,
} from "@/states/features/attendance.slice"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

function isPendingSession(session: WorkSession) {
  return (
    session.status === WorkSessionStatus.PENDING_REVIEW ||
    session.status === WorkSessionStatus.CLOCKED_OUT ||
    session.hasExceptions ||
    session.reviewStatus === "REQUIRED"
  )
}

const reviewCopy = {
  approve: {
    heading: "Approve session",
    description:
      "Approve this work session? The employee's recorded time will be marked as approved.",
    confirmLabel: "Approve session",
    confirmVariant: "default" as const,
  },
  reject: {
    heading: "Reject session",
    description: "Reject this work session? The employee will need to resubmit their time.",
    confirmLabel: "Reject session",
    confirmVariant: "destructive" as const,
  },
  lock: {
    heading: "Lock session",
    description:
      "Lock this work session? Locked sessions are finalized and can no longer be edited.",
    confirmLabel: "Lock session",
    confirmVariant: "destructive" as const,
  },
}

const AttendanceReview = () => {
  const dispatch = useAppDispatch()
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const isReviewing = useAppSelector((s) => s.attendance.status.review === "loading")
  const statusOrgSessions = useAppSelector((s) => s.attendance.status.orgSessions)
  const reviewConfirm = useAppSelector((s) => s.attendance.confirmSessionReview)

  React.useEffect(() => {
    dispatch(fetchOrgSessions())
    dispatch(fetchExceptions())
    dispatch(fetchEmployees())
  }, [dispatch])

  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])

  const pendingSessions = React.useMemo(
    () => orgSessions.filter(isPendingSession),
    [orgSessions],
  )
  const approvedSessions = React.useMemo(
    () => orgSessions.filter((session) => session.status === WorkSessionStatus.APPROVED),
    [orgSessions],
  )

  const handleReview = async (action: "approve" | "reject" | "lock", sessionId: string) => {
    try {
      if (action === "approve") await dispatch(approveSession(sessionId)).unwrap()
      else if (action === "reject") await dispatch(rejectSession(sessionId)).unwrap()
      else await dispatch(lockSession(sessionId)).unwrap()
      dispatch(fetchOrgSessions())
      dispatch(fetchExceptions())
      dispatch(closeSessionReviewConfirm())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const pendingColumns: ColumnDef<WorkSession>[] = React.useMemo(
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
              <Link
                to={`/scheduling/clock-ins/${row.original.id}`}
                className="truncate text-[13px] font-medium text-foreground underline-offset-2 hover:underline"
              >
                {name}
              </Link>
              <span className="font-mono text-[12px] text-muted-foreground">
                {shortId(row.original.employeeMembershipId)}
              </span>
            </div>
          )
        },
        meta: { width: "14rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "actualClockInAt",
        header: "Clock in",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-[13px]">{formatDateTime(getValue<string>())}</span>
        ),
        meta: { width: "11rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <StatusBadge
            status={getValue<WorkSessionStatus>()}
            toneMap={{
              [WorkSessionStatus.OPEN]: "outline",
              [WorkSessionStatus.CLOCKED_OUT]: "outline",
              [WorkSessionStatus.PENDING_REVIEW]: "outline",
              [WorkSessionStatus.APPROVED]: "outline",
              [WorkSessionStatus.REJECTED]: "outline",
              [WorkSessionStatus.LOCKED]: "outline",
              [WorkSessionStatus.CANCELLED]: "outline",
            }}
          />
        ),
        meta: { width: "10rem", cellClassName: "py-3" },
      },
      {
        id: "flags",
        header: "Flags",
        cell: ({ row }) =>
          row.original.exceptionCount > 0 ? (
            <span className="inline-flex h-6 items-center border border-warning/25 bg-warning/10 px-2 text-[13px] text-warning tabular-nums">
              {row.original.exceptionCount}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          ),
        meta: { align: "right", width: "5rem", cellClassName: "py-3" },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch(openSessionReviewConfirm({ action: "approve", session: row.original }))
              }
              disabled={isReviewing || row.original.status === WorkSessionStatus.APPROVED}
            >
              <CheckCircle2Icon className="size-3.5" />
              Approve
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                dispatch(openSessionReviewConfirm({ action: "reject", session: row.original }))
              }
              disabled={isReviewing}
            >
              <XCircleIcon className="size-3.5" />
              Reject
            </Button>
          </div>
        ),
        meta: { align: "right", width: "14rem", cellClassName: "py-3" },
      },
    ],
    [dispatch, employeeByMembershipId, isReviewing],
  )

  const lockColumns: ColumnDef<WorkSession>[] = React.useMemo(
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
              <Link
                to={`/scheduling/clock-ins/${row.original.id}`}
                className="truncate text-[13px] font-medium text-foreground underline-offset-2 hover:underline"
              >
                {name}
              </Link>
              <span className="font-mono text-[12px] text-muted-foreground">
                {shortId(row.original.employeeMembershipId)}
              </span>
            </div>
          )
        },
        meta: { width: "14rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "actualClockInAt",
        header: "Clock in",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-[13px]">{formatDateTime(getValue<string>())}</span>
        ),
        meta: { width: "11rem", cellClassName: "py-3" },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch(openSessionReviewConfirm({ action: "lock", session: row.original }))
              }
              disabled={isReviewing}
            >
              <LockIcon className="size-3.5" />
              Lock
            </Button>
          </div>
        ),
        meta: { align: "right", width: "8rem", cellClassName: "py-3" },
      },
    ],
    [dispatch, employeeByMembershipId, isReviewing],
  )

  const isLoadingSessions =
    statusOrgSessions === "loading" && orgSessions.length === 0
  const isFetchingSessions =
    statusOrgSessions === "loading" && orgSessions.length > 0

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
                <PageHeader
                  title="Review queue"
                  description="Approve, reject, or lock work sessions. Policy flags live under Exception queue."
                  titleClassName="text-xl"
                  descriptionClassName="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-border/70 p-4">
                <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                  Pending
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {pendingSessions.length}
                </div>
              </div>
              <div className="border border-border/70 p-4">
                <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                  Ready to lock
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {approvedSessions.length}
                </div>
              </div>
              <Link
                to="/reports/exception-queue"
                className="border border-border/70 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                  Open exceptions
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{exceptions.length}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">Open exception queue →</div>
              </Link>
            </div>

            <DataTable
              eyebrow="Review"
              title="Pending sessions"
              description="Sessions that need approval, rejection, or attention for policy flags."
              columns={pendingColumns}
              data={pendingSessions}
              tableClassName="min-w-[720px]"
              getRowId={(session) => session.id}
              hidePagination
              isLoading={isLoadingSessions}
              isFetching={isFetchingSessions}
              emptyTitle="No pending sessions"
              emptyDescription="No work sessions currently need review."
            />

            <DataTable
              eyebrow="Review"
              title="Approved — ready to lock"
              description="Approved sessions that can be finalized."
              columns={lockColumns}
              data={approvedSessions}
              tableClassName="min-w-[520px]"
              getRowId={(session) => session.id}
              hidePagination
              isLoading={isLoadingSessions}
              isFetching={isFetchingSessions}
              emptyTitle="No approved sessions"
              emptyDescription="Approved sessions will appear here when they can be locked."
            />
          </div>
        </div>

        {reviewConfirm.action && reviewConfirm.session ? (
          <ConfirmationModal
            isOpen={reviewConfirm.isOpen}
            onClose={() => dispatch(closeSessionReviewConfirm())}
            onConfirm={() =>
              handleReview(reviewConfirm.action!, reviewConfirm.session!.id)
            }
            isLoading={isReviewing}
            heading={reviewCopy[reviewConfirm.action].heading}
            description={reviewCopy[reviewConfirm.action].description}
            confirmLabel={reviewCopy[reviewConfirm.action].confirmLabel}
            confirmVariant={reviewCopy[reviewConfirm.action].confirmVariant}
          />
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AttendanceReview
