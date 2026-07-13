import * as React from "react"
import { Activity, AlertTriangle, MapPin, Pencil, UsersRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import StatusBadge from "@/components/reusable/badges/StatusBadge"
import { cn } from "@/lib/utils"
import {
  formatDateISO,
  formatTime,
  formatDateTime,
  formatDuration,
  shortId,
  employeeName,
} from "@/lib/format"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { openCancelInstanceConfirm } from "@/states/features/scheduling.slice"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftInstance,
  type ShiftPattern,
  type ShiftPatternAssignment,
} from "@/lib/api/scheduling.api"
import { instanceStatusTone } from "../scheduling.constants"
import { ExceptionRow } from "./ExceptionRow"
import { OverrideInstanceForm } from "./OverrideInstanceForm"

function DetailMetaRow({
  label,
  value,
  mono,
}: {
  label: React.ReactNode
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-border/50 py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-[13px] font-medium text-foreground sm:text-right",
          mono && "break-all font-mono text-xs font-normal leading-relaxed",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function ShiftDetailsDialog({
  instance,
  patterns,
  patternAssignments,
  open,
  onOpenChange,
  onDone,
  blockDismiss = false,
}: {
  instance: ShiftInstance | null
  patterns: ShiftPattern[]
  patternAssignments: ShiftPatternAssignment[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
  /** Keep the sheet open while a nested confirmation modal is showing. */
  blockDismiss?: boolean
}) {
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      // Nested Dialog (e.g. cancel-shift confirm) shares dismiss layers with the Sheet.
      // Ignore close requests while that modal is open so dismissing it leaves the panel up.
      if (!next && blockDismiss) return
      onOpenChange(next)
    },
    [blockDismiss, onOpenChange],
  )

  const preventWhileBlocked = React.useCallback(
    (event: { preventDefault: () => void }) => {
      if (blockDismiss) event.preventDefault()
    },
    [blockDismiss],
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className={cn(
          // Full width on phones; comfortable side panel on larger screens.
          // Override base sheet `w-3/4` + `sm:max-w-sm` so content never crushes.
          "flex h-full w-full flex-col gap-0 overflow-hidden p-0",
          "data-[side=right]:w-full data-[side=right]:sm:max-w-md data-[side=right]:md:max-w-lg data-[side=right]:lg:max-w-xl",
        )}
        onInteractOutside={preventWhileBlocked}
        onPointerDownOutside={preventWhileBlocked}
        onFocusOutside={preventWhileBlocked}
        onEscapeKeyDown={preventWhileBlocked}
      >
        <SheetHeader className="shrink-0 border-b border-border/70 px-4 py-4 pr-12 sm:px-5">
          <SheetDescription className="text-[12px] uppercase tracking-[0.12em]">
            Coverage detail
          </SheetDescription>
          <SheetTitle className="text-base sm:text-lg">Shift details</SheetTitle>
        </SheetHeader>
        {instance && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 sm:p-5">
              <ShiftDetailsContent
                key={instance.id}
                instance={instance}
                patterns={patterns}
                patternAssignments={patternAssignments}
                onOpenChange={handleOpenChange}
                onDone={onDone}
              />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ShiftDetailsContent({
  instance,
  patterns,
  patternAssignments,
  onOpenChange,
  onDone,
}: {
  instance: ShiftInstance
  patterns: ShiftPattern[]
  patternAssignments: ShiftPatternAssignment[]
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const sessions = useAppSelector((s) => s.attendance.orgSessions)
  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const dispatch = useAppDispatch()
  const isCancelling = useAppSelector((s) => s.scheduling.status.cancelInstance === "loading")
  const [isEditing, setIsEditing] = React.useState(false)

  const pattern = React.useMemo(
    () => patterns.find((item) => item.id === instance.patternId) ?? null,
    [instance.patternId, patterns],
  )
  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])
  const activeAssignments = React.useMemo(
    () =>
      patternAssignments.filter(
        (assignment) =>
          assignment.shiftPatternId === instance.patternId &&
          assignment.status === ShiftAssignmentStatus.ACTIVE,
      ),
    [instance.patternId, patternAssignments],
  )
  const assignedEmployees = activeAssignments.map(
    (assignment) => employeeByMembershipId.get(assignment.employeeMembershipId) ?? shortId(assignment.employeeMembershipId),
  )
  const relatedSessions = React.useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.plannedShiftInstanceId === instance.id ||
          (instance.patternId && session.plannedShiftPatternId === instance.patternId),
      ),
    [instance.id, instance.patternId, sessions],
  )
  const relatedExceptions = React.useMemo(() => {
    const sessionIds = new Set(relatedSessions.map((session) => session.id))
    return exceptions.filter((exception) =>
      exception.workSessionId ? sessionIds.has(exception.workSessionId) : false,
    )
  }, [exceptions, relatedSessions])
  const canCancel =
    instance.status !== ShiftInstanceStatus.CANCELLED &&
    instance.status !== ShiftInstanceStatus.COMPLETED

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Summary — single column so labels never collide in a narrow sheet */}
      <div className="rounded-md border border-border/70 bg-field p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {formatDateISO(instance.shiftDate)}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
              <span className="whitespace-nowrap">{formatTime(instance.startAt)}</span>
              <span className="mx-1.5 text-muted-foreground">–</span>
              <span className="whitespace-nowrap">{formatTime(instance.endAt)}</span>
            </div>
          </div>
          <StatusBadge
            status={instance.status}
            toneMap={instanceStatusTone}
            size="md"
            className="shrink-0"
          />
        </div>

        <dl className="mt-3 border-t border-border/60 sm:mt-4">
          <DetailMetaRow
            label="Duration"
            value={formatDuration(instance.startAt, instance.endAt)}
          />
          <DetailMetaRow
            label="Pattern"
            value={
              pattern?.name ?? (instance.patternId ? shortId(instance.patternId) : "No pattern")
            }
          />
          <DetailMetaRow label="Starts" value={formatDateTime(instance.startAt)} />
          <DetailMetaRow label="Ends" value={formatDateTime(instance.endAt)} />
        </dl>
      </div>

      {/* Coverage */}
      <div className="rounded-md border border-border/70 p-3 sm:p-4">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <UsersRound className="size-4 shrink-0" aria-hidden="true" />
          Coverage
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {assignedEmployees.length > 0 ? (
            assignedEmployees.map((name) => (
              <span
                key={name}
                className="inline-flex max-w-full items-center border border-success/20 bg-success/10 px-2.5 py-1 text-[13px] font-medium text-success"
              >
                <span className="truncate">{name}</span>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center border border-warning/25 bg-warning/10 px-2.5 py-1 text-[13px] font-medium text-warning">
              Unassigned
            </span>
          )}
        </div>
        <dl className="mt-3 border-t border-border/60">
          <DetailMetaRow label="Shift ID" value={instance.id} mono />
          {instance.patternId ? (
            <DetailMetaRow label="Pattern ID" value={instance.patternId} mono />
          ) : null}
          {instance.workSiteId ? (
            <DetailMetaRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Work site
                </span>
              }
              value={instance.workSiteId}
              mono
            />
          ) : null}
        </dl>
      </div>

      {/* Sessions + exceptions: always stacked in the side sheet so labels/text never crush */}
      <div className="flex flex-col gap-4">
        <div className="min-w-0 rounded-md border border-border/70 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Activity className="size-4 shrink-0" aria-hidden="true" />
            Clock sessions
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {relatedSessions.length > 0 ? (
              relatedSessions.slice(0, 4).map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-1 border-b border-border/60 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {employeeByMembershipId.get(session.employeeMembershipId) ??
                        shortId(session.employeeMembershipId)}
                    </div>
                    <div className="text-[12px] text-muted-foreground tabular-nums">
                      <span className="whitespace-nowrap">{formatTime(session.actualClockInAt)}</span>
                      {" – "}
                      <span className="whitespace-nowrap">
                        {session.actualClockOutAt
                          ? formatTime(session.actualClockOutAt)
                          : "open"}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] uppercase text-muted-foreground">
                    {session.status.replaceAll("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No clock session has matched this shift yet.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-border/70 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Policy exceptions
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {relatedExceptions.length > 0 ? (
              relatedExceptions.slice(0, 4).map((exception) => (
                <ExceptionRow key={exception.id} exception={exception} />
              ))
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No open exceptions are tied to this shift.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit times */}
      <div className="rounded-md border border-border/70 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium">Edit times</div>
            <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Adjust this generated shift without changing the source pattern.
            </div>
          </div>
          <Button
            type="button"
            variant={isEditing ? "secondary" : "outline"}
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setIsEditing((value) => !value)}
          >
            <Pencil data-icon="inline-start" />
            {isEditing ? "Close editor" : "Edit times"}
          </Button>
        </div>
        {isEditing && (
          <div className="mt-4 border-t border-border/70 pt-4">
            <OverrideInstanceForm
              instance={instance}
              onOpenChange={onOpenChange}
              onDone={onDone}
            />
          </div>
        )}
      </div>

      {canCancel && (
        <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => dispatch(openCancelInstanceConfirm(instance))}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling…" : "Cancel shift"}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ShiftDetailsDialog
