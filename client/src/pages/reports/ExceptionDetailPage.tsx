"use client"

import * as React from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import ConfirmationModal from "@/components/reusable/cards/ConfirmationModal"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AttendanceExceptionStatus } from "@/lib/api/attendance.api"
import { showApiErrorToast } from "@/lib/api/errors"
import {
  clearExceptionDetail,
  closeExceptionActionConfirm,
  dismissException,
  fetchExceptionDetail,
  openExceptionActionConfirm,
  resolveException,
} from "@/states/features/attendance.slice"
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-border/50 py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-[13px] font-medium text-foreground sm:text-right">
        {value ?? "—"}
      </span>
    </div>
  )
}

const actionCopy = {
  resolve: {
    heading: "Resolve exception",
    description:
      "Mark this policy exception as resolved? It will leave the open queue.",
    confirmLabel: "Resolve exception",
    confirmVariant: "default" as const,
  },
  dismiss: {
    heading: "Dismiss exception",
    description:
      "Dismiss this policy exception? Use this when the flag does not require further action.",
    confirmLabel: "Dismiss exception",
    confirmVariant: "destructive" as const,
  },
}

const ExceptionDetailPage = () => {
  const { exceptionId } = useParams<{ exceptionId: string }>()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const exception = useAppSelector((s) => s.attendance.exceptionDetail)
  const status = useAppSelector((s) => s.attendance.status.exceptionDetail)
  const actionLoading = useAppSelector((s) => s.attendance.status.exceptionAction === "loading")
  const confirm = useAppSelector((s) => s.attendance.confirmExceptionAction)
  const employees = useAppSelector((s) => s.employeeManagement.employees)

  const backTo = React.useMemo(
    () => ({
      pathname: "/reports/exception-queue",
      search: location.search,
    }),
    [location.search],
  )

  React.useEffect(() => {
    dispatch(fetchEmployees())
  }, [dispatch])

  React.useEffect(() => {
    if (!exceptionId) return
    dispatch(fetchExceptionDetail(exceptionId))
    return () => {
      dispatch(clearExceptionDetail())
    }
  }, [dispatch, exceptionId])

  const employeeLabel = React.useMemo(() => {
    if (!exception) return null
    const employee = employees.find((e) => e.membershipId === exception.employeeMembershipId)
    if (employee) return employeeName(employee)
    return shortId(exception.employeeMembershipId)
  }, [employees, exception])

  const handleConfirm = async () => {
    if (!confirm.action || !confirm.exception) return
    try {
      if (confirm.action === "resolve") {
        await dispatch(resolveException(confirm.exception.id)).unwrap()
        toast.success("Exception resolved")
      } else {
        await dispatch(dismissException(confirm.exception.id)).unwrap()
        toast.success("Exception dismissed")
      }
      dispatch(closeExceptionActionConfirm())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const isLoading = status === "loading" || (status === "idle" && !exception && !!exceptionId)
  const isError = status === "error"
  const isOpen = exception?.status === AttendanceExceptionStatus.OPEN

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
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 mb-2 h-8 px-2 text-muted-foreground"
                asChild
              >
                <Link to={backTo}>
                  <ArrowLeft className="size-4" />
                  Exception queue
                </Link>
              </Button>
              <div className="operations-label">Attendance</div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Exception detail
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {employeeLabel
                  ? `Policy flag for ${employeeLabel}`
                  : "Review and resolve this attendance policy exception."}
              </p>
            </div>

            {isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading exception…</p>
            ) : isError || !exception ? (
              <div className="border border-border/70 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {isError ? "Could not load this exception." : "Exception not found."}
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to={backTo}>Back to queue</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="border border-border/70 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-medium text-foreground">
                      {exception.code.replaceAll("_", " ")}
                    </div>
                    <span className="inline-flex h-6 items-center border border-border px-2 text-[12px] uppercase text-muted-foreground">
                      {exception.status}
                    </span>
                  </div>
                  <dl>
                    <DetailRow label="Message" value={exception.message} />
                    <DetailRow label="Severity" value={exception.severity} />
                    <DetailRow label="Status" value={exception.status} />
                    <DetailRow label="Employee" value={employeeLabel} />
                    <DetailRow
                      label="Membership"
                      value={
                        <span className="break-all font-mono text-xs font-normal">
                          {exception.employeeMembershipId}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Session"
                      value={
                        exception.workSessionId ? (
                          <Link
                            to={`/scheduling/clock-ins/${exception.workSessionId}`}
                            className="font-mono text-xs underline-offset-2 hover:underline"
                          >
                            {exception.workSessionId}
                          </Link>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <DetailRow
                      label="Event"
                      value={
                        exception.attendanceEventId ? (
                          <span className="break-all font-mono text-xs font-normal">
                            {exception.attendanceEventId}
                          </span>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <DetailRow label="Created" value={formatDateTime(exception.createdAt)} />
                  </dl>
                </div>

                {isOpen ? (
                  <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={actionLoading}
                      onClick={() =>
                        dispatch(
                          openExceptionActionConfirm({ action: "resolve", exception }),
                        )
                      }
                    >
                      <CheckCircle2Icon className="size-3.5" />
                      Resolve
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={actionLoading}
                      onClick={() =>
                        dispatch(
                          openExceptionActionConfirm({ action: "dismiss", exception }),
                        )
                      }
                    >
                      <XCircleIcon className="size-3.5" />
                      Dismiss
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This exception is {exception.status.toLowerCase()} and no longer needs action.
                  </p>
                )}

                <div className="flex justify-start border-t border-border pt-4">
                  <Button variant="outline" asChild>
                    <Link to={backTo}>
                      <ArrowLeft className="size-4" />
                      Back to exception queue
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {confirm.action && confirm.exception ? (
          <ConfirmationModal
            isOpen={confirm.isOpen}
            onClose={() => dispatch(closeExceptionActionConfirm())}
            onConfirm={handleConfirm}
            isLoading={actionLoading}
            heading={actionCopy[confirm.action].heading}
            description={actionCopy[confirm.action].description}
            confirmLabel={actionCopy[confirm.action].confirmLabel}
            confirmVariant={actionCopy[confirm.action].confirmVariant}
          />
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ExceptionDetailPage
