"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { Calendar, Views, momentLocalizer, type View } from "react-big-calendar"
import moment from "moment"
import { colord } from "colord"
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  Clock3,
  Eye,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Pencil,
  UsersRound,
} from "lucide-react"
import "react-big-calendar/lib/css/react-big-calendar.css"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Modal from "@/components/reusable/cards/Modal"
import ConfirmationModal from "@/components/reusable/cards/ConfirmationModal"
import Combobox from "@/components/reusable/inputs/Combobox"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import { DataTable } from "@/components/reusable/tables"
import { cn } from "@/lib/utils"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import {
  approveSession,
  closeSessionReviewConfirm,
  fetchDayClockIns,
  fetchExceptions,
  fetchOrgSessions,
  lockSession,
  openSessionReviewConfirm,
  rejectSession,
} from "@/states/features/attendance.slice"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import {
  cancelInstance,
  cancelPatternAssignment,
  closeCancelInstanceConfirm,
  closeRemoveAssignmentConfirm,
  createPatternAssignment,
  createPattern,
  fetchPatternAssignments,
  fetchPatternAssignmentsPage,
  fetchInstances,
  fetchInstancesPage,
  fetchPatterns,
  openCancelInstanceConfirm,
  openRemoveAssignmentConfirm,
  overrideInstance,
} from "@/states/features/scheduling.slice"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftPatternAssignment,
  type ShiftInstance,
  type ShiftPattern,
} from "@/lib/api/scheduling.api"
import {
  WorkSessionStatus,
  type AttendanceException,
  type WorkSession,
} from "@/lib/api/attendance.api"
import { showApiErrorToast } from "@/lib/api/errors"
import { useNavigate } from "react-router-dom"

// --- helpers ---

function shortId(id: string) {
  return id.slice(0, 8)
}

function formatDateISO(iso: string) {
  // "YYYY-MM-DD" -> render as local calendar date without timezone shift.
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
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

function formatDuration(startIso: string, endIso: string) {
  const minutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

function statusLabel(status: ShiftInstanceStatus | ShiftAssignmentStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toIsoDate(date: Date | undefined): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function employeeName(employee: { firstName: string; lastName: string; email: string }) {
  const name = `${employee.firstName} ${employee.lastName}`.trim()
  return name || employee.email
}

// --- constants ---

const WEEKDAYS: { iso: number; label: string; short: string }[] = [
  { iso: 1, label: "Monday", short: "Mon" },
  { iso: 2, label: "Tuesday", short: "Tue" },
  { iso: 3, label: "Wednesday", short: "Wed" },
  { iso: 4, label: "Thursday", short: "Thu" },
  { iso: 5, label: "Friday", short: "Fri" },
  { iso: 6, label: "Saturday", short: "Sat" },
  { iso: 7, label: "Sunday", short: "Sun" },
]

const WEEKDAY_PRESETS: { key: string; label: string; days: number[] }[] = [
  { key: "weekdays", label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { key: "weekends", label: "Weekends", days: [6, 7] },
  { key: "every_day", label: "Every day", days: [1, 2, 3, 4, 5, 6, 7] },
]

const calendarPalette = {
  ink: "#12313F",
  assigned: "#12806A",
  unassigned: "#B56B12",
  modified: "#6D5BD0",
  completed: "#2563EB",
  cancelled: "#64748B",
} as const

function daysLabel(days: number[]): string {
  if (!days.length) return "Does not repeat"
  const sorted = [...days].sort((a, b) => a - b)
  for (const preset of WEEKDAY_PRESETS) {
    if (
      preset.days.length === sorted.length &&
      preset.days.every((d, i) => d === sorted[i])
    ) {
      return preset.label
    }
  }
  return sorted.map((d) => WEEKDAYS[d - 1].short).join(", ")
}

// --- badge styles ---

const instanceStatusClass: Record<ShiftInstanceStatus, string> = {
  [ShiftInstanceStatus.SCHEDULED]: "border-success/20 bg-success/10 text-success",
  [ShiftInstanceStatus.CANCELLED]: "border-border bg-muted text-muted-foreground",
  [ShiftInstanceStatus.MODIFIED]: "border-warning/25 bg-warning/10 text-warning",
  [ShiftInstanceStatus.COMPLETED]: "border-primary/20 bg-primary/10 text-primary",
}

const assignmentStatusClass: Record<ShiftAssignmentStatus, string> = {
  [ShiftAssignmentStatus.ACTIVE]: "border-success/20 bg-success/10 text-success",
  [ShiftAssignmentStatus.CANCELLED]: "border-border bg-muted text-muted-foreground",
  [ShiftAssignmentStatus.REASSIGNED]: "border-warning/25 bg-warning/10 text-warning",
}

// --- View types ---

type SchedulingView = "coverage" | "clock-ins" | "shifts" | "assignments"

const calendarLocalizer = momentLocalizer(moment)

// --- Create shift dialog ---

type Recurrence = "none" | "weekly"

function NewShiftDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((s) => s.scheduling.status.createPattern === "loading")

  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("17:00")
  const [timezone, setTimezone] = React.useState("")
  const [recurrence, setRecurrence] = React.useState<Recurrence>("weekly")
  const [daysOfWeek, setDaysOfWeek] = React.useState<number[]>([1, 2, 3, 4, 5])
  const [effectiveFrom, setEffectiveFrom] = React.useState<Date | undefined>(new Date())
  const [effectiveUntil, setEffectiveUntil] = React.useState<Date | undefined>(undefined)

  const reset = () => {
    setName("")
    setStartTime("09:00")
    setEndTime("17:00")
    setTimezone("")
    setRecurrence("weekly")
    setDaysOfWeek([1, 2, 3, 4, 5])
    setEffectiveFrom(new Date())
    setEffectiveUntil(undefined)
  }

  const toggleDay = (iso: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort((a, b) => a - b),
    )
  }

  const applyPreset = (days: number[]) => {
    setDaysOfWeek([...days])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveFrom) {
      showApiErrorToast(new Error("Please pick a start date"))
      return
    }
    const from = toIsoDate(effectiveFrom)
    const isRecurring = recurrence === "weekly" && daysOfWeek.length > 0
    const until = isRecurring
      ? effectiveUntil
        ? toIsoDate(effectiveUntil)
        : undefined
      : from
    try {
      await dispatch(
        createPattern({
          name,
          startTime,
          endTime,
          daysOfWeek: isRecurring ? daysOfWeek : [],
          effectiveFrom: from,
          effectiveUntil: until,
          ...(timezone.trim() ? { timezone: timezone.trim() } : {}),
        }),
      ).unwrap()
      setOpen(false)
      reset()
      onCreated()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New Shift
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        heading="New shift"
        className="sm:min-w-0 sm:max-w-md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Name</Label>
            <Input
              required
              placeholder="e.g. Morning Ward"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Start time</Label>
              <Input
                required
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">End time</Label>
              <Input
                required
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Timezone (optional)</Label>
            <Input
              placeholder="e.g. America/Chicago"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[13px]">Repeat</Label>
            <div className="flex gap-2">
              {(["none", "weekly"] as Recurrence[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRecurrence(option)}
                  className={cn(
                    "flex-1 h-9 border px-3 text-[13px] transition-colors",
                    recurrence === option
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option === "none" ? "Does not repeat" : "Repeat weekly"}
                </button>
              ))}
            </div>
          </div>

          {recurrence === "weekly" && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-[13px]">Days of week</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const active = daysOfWeek.includes(day.iso)
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => toggleDay(day.iso)}
                        className={cn(
                          "h-9 min-w-11 border px-2 text-[13px] transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                        )}
                        aria-pressed={active}
                        aria-label={day.label}
                      >
                        {day.short}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyPreset(preset.days)}
                      className="h-7 border border-border bg-transparent px-2 text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">
                {recurrence === "none" ? "Date" : "Starts on"}
              </Label>
              <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} />
            </div>
            {recurrence === "weekly" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px]">Ends on (optional)</Label>
                <DatePicker
                  value={effectiveUntil}
                  onChange={setEffectiveUntil}
                  fromDate={effectiveFrom}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={
                isLoading ||
                !name ||
                (recurrence === "weekly" && daysOfWeek.length === 0)
              }
            >
              {isLoading ? "Creating…" : "Create shift"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// --- Shift details dialog ---

function ShiftDetailsDialog({
  instance,
  patterns,
  patternAssignments,
  open,
  onOpenChange,
  onDone,
}: {
  instance: ShiftInstance | null
  patterns: ShiftPattern[]
  patternAssignments: ShiftPatternAssignment[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetDescription className="text-[13px] uppercase tracking-[0.12em]">
            Coverage detail
          </SheetDescription>
          <SheetTitle className="text-lg">Shift details</SheetTitle>
        </SheetHeader>
        {instance && (
          <div className="p-5">
            <ShiftDetailsContent
              key={instance.id}
              instance={instance}
              patterns={patterns}
              patternAssignments={patternAssignments}
              onOpenChange={onOpenChange}
              onDone={onDone}
            />
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
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-border/70 bg-field p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {formatDateISO(instance.shiftDate)}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {formatTime(instance.startAt)} - {formatTime(instance.endAt)}
              </div>
            </div>
            <span className={cn("inline-flex h-7 items-center border px-2 text-[12px] uppercase", instanceStatusClass[instance.status])}>
              {statusLabel(instance.status)}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium tabular-nums">{formatDuration(instance.startAt, instance.endAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Pattern</div>
              <div className="font-medium">{pattern?.name ?? (instance.patternId ? shortId(instance.patternId) : "No pattern")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Starts</div>
              <div className="font-medium tabular-nums">{formatDateTime(instance.startAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Ends</div>
              <div className="font-medium tabular-nums">{formatDateTime(instance.endAt)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/70 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <UsersRound className="size-4" aria-hidden="true" />
            Coverage
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {assignedEmployees.length > 0 ? (
              assignedEmployees.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center border border-success/20 bg-success/10 px-2.5 py-1 text-[13px] font-medium text-success"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center border border-warning/25 bg-warning/10 px-2.5 py-1 text-[13px] font-medium text-warning">
                Unassigned
              </span>
            )}
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Shift ID</dt>
              <dd className="truncate font-mono text-xs">{instance.id}</dd>
            </div>
            {instance.patternId && (
              <div>
                <dt className="text-muted-foreground">Pattern ID</dt>
                <dd className="truncate font-mono text-xs">{instance.patternId}</dd>
              </div>
            )}
            {instance.workSiteId && (
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Work site ID
                </dt>
                <dd className="truncate font-mono text-xs">{instance.workSiteId}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border/70 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Activity className="size-4" aria-hidden="true" />
            Clock sessions
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {relatedSessions.length > 0 ? (
              relatedSessions.slice(0, 4).map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {employeeByMembershipId.get(session.employeeMembershipId) ?? shortId(session.employeeMembershipId)}
                    </div>
                    <div className="text-[12px] text-muted-foreground tabular-nums">
                      {formatTime(session.actualClockInAt)} - {session.actualClockOutAt ? formatTime(session.actualClockOutAt) : "open"}
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] uppercase text-muted-foreground">
                    {session.status.replaceAll("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No clock session has matched this shift yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border/70 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Policy exceptions
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {relatedExceptions.length > 0 ? (
              relatedExceptions.slice(0, 4).map((exception) => (
                <ExceptionRow key={exception.id} exception={exception} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open exceptions are tied to this shift.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Edit times</div>
            <div className="text-[13px] text-muted-foreground">
              Adjust this generated shift without changing the source pattern.
            </div>
          </div>
          <Button
            type="button"
            variant={isEditing ? "secondary" : "outline"}
            size="sm"
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
        <div className="flex justify-end border-t border-border/70 pt-4">
          <Button
            type="button"
            variant="destructive"
            size="sm"
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

function OverrideInstanceForm({
  instance,
  onOpenChange,
  onDone,
}: {
  instance: ShiftInstance
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((s) => s.scheduling.status.overrideInstance === "loading")
  const [startAt, setStartAt] = React.useState(() => toLocalDatetime(instance.startAt))
  const [endAt, setEndAt] = React.useState(() => toLocalDatetime(instance.endAt))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instance) return
    try {
      await dispatch(
        overrideInstance({
          id: instance.id,
          payload: {
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
          },
        }),
      ).unwrap()
      onOpenChange(false)
      onDone()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[13px]">Start</Label>
        <Input
          required
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[13px]">End</Label>
        <Input
          required
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// --- Assign employee dialog ---

function AssignEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const patterns = useAppSelector((s) => s.scheduling.patterns)
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const isLoading = useAppSelector((s) => s.scheduling.status.assign === "loading")

  const [open, setOpen] = React.useState(false)
  const [shiftPatternId, setShiftPatternId] = React.useState("")
  const [employeeMembershipId, setEmployeeMembershipId] = React.useState("")
  const [effectiveFrom, setEffectiveFrom] = React.useState<Date | undefined>(undefined)
  const [effectiveUntil, setEffectiveUntil] = React.useState<Date | undefined>(undefined)

  const activePatterns = React.useMemo(
    () => patterns.filter((pattern) => pattern.active),
    [patterns],
  )
  const shiftOptions = React.useMemo(
    () =>
      activePatterns.map((pattern) => ({
        label: `${pattern.name} · ${daysLabel(pattern.daysOfWeek)} · ${pattern.startTime} – ${pattern.endTime}`,
        value: pattern.id,
      })),
    [activePatterns],
  )
  const employeeOptions = React.useMemo(
    () =>
      employees.map((employee) => ({
        label: `${employeeName(employee)} · ${employee.email}`,
        value: employee.membershipId,
      })),
    [employees],
  )

  React.useEffect(() => {
    if (open && employees.length === 0) dispatch(fetchEmployees())
  }, [dispatch, employees.length, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dispatch(
        createPatternAssignment({
          shiftPatternId,
          employeeMembershipId,
          ...(effectiveFrom ? { effectiveFrom: toIsoDate(effectiveFrom) } : {}),
          ...(effectiveUntil ? { effectiveUntil: toIsoDate(effectiveUntil) } : {}),
        }),
      ).unwrap()
      setOpen(false)
      setShiftPatternId("")
      setEmployeeMembershipId("")
      setEffectiveFrom(undefined)
      setEffectiveUntil(undefined)
      onCreated()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Assign Employee
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        heading="Assign employee to shift pattern"
        className="sm:min-w-0 sm:max-w-sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Shift pattern</Label>
            {activePatterns.length > 0 ? (
              <Combobox
                value={shiftPatternId}
                onChange={setShiftPatternId}
                options={shiftOptions}
                placeholder="Select a shift pattern"
                searchPlaceholder="Search shift patterns"
              />
            ) : (
              <Input
                required
                placeholder="Shift pattern ID"
                value={shiftPatternId}
                onChange={(e) => setShiftPatternId(e.target.value)}
                className="font-mono"
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Employee</Label>
            {employeeOptions.length > 0 ? (
              <Combobox
                value={employeeMembershipId}
                onChange={setEmployeeMembershipId}
                options={employeeOptions}
                placeholder="Select an employee"
                searchPlaceholder="Search employees"
              />
            ) : (
              <Input
                required
                placeholder="Employee membership ID"
                value={employeeMembershipId}
                onChange={(e) => setEmployeeMembershipId(e.target.value)}
                className="font-mono"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Starts on (optional)</Label>
              <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Ends on (optional)</Label>
              <DatePicker
                value={effectiveUntil}
                onChange={setEffectiveUntil}
                fromDate={effectiveFrom}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !shiftPatternId || !employeeMembershipId}
            >
              {isLoading ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// --- Main page ---

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  instance: ShiftInstance
  assignmentSummary: string
  assignedNames: string[]
  patternName: string
}

function calendarEventBaseColor(event: CalendarEvent) {
  if (event.instance.status === ShiftInstanceStatus.CANCELLED) return calendarPalette.cancelled
  if (event.instance.status === ShiftInstanceStatus.COMPLETED) return calendarPalette.completed
  if (event.instance.status === ShiftInstanceStatus.MODIFIED) return calendarPalette.modified
  return event.assignedNames.length > 0 ? calendarPalette.assigned : calendarPalette.unassigned
}

function getCalendarEventColors(event: CalendarEvent) {
  const base = colord(calendarEventBaseColor(event))
  const isLight = base.isLight()
  const foreground = isLight ? calendarPalette.ink : "#FFFFFF"
  return {
    background: base.toHex(),
    border: isLight ? base.darken(0.16).toHex() : base.darken(0.08).toHex(),
    foreground,
    muted: colord(foreground).alpha(isLight ? 0.72 : 0.82).toRgbString(),
    hover: isLight ? base.darken(0.05).toHex() : base.lighten(0.06).toHex(),
  }
}

function CalendarEventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="scheduling-calendar-event-card">
      <div className="scheduling-calendar-event-body">
        <div className="scheduling-calendar-event-time">
          <Clock3 aria-hidden="true" />
          <span>{formatTime(event.instance.startAt)} - {formatTime(event.instance.endAt)}</span>
        </div>
        <div className="scheduling-calendar-event-main">
          <UsersRound aria-hidden="true" />
          <span>{event.assignmentSummary}</span>
        </div>
        {event.patternName && (
          <div className="scheduling-calendar-event-pattern">
            {event.patternName}
          </div>
        )}
        <div className="scheduling-calendar-event-meta">
          <span>{statusLabel(event.instance.status)}</span>
          <span className="scheduling-calendar-event-detail">
            <Eye aria-hidden="true" />
            Details
          </span>
        </div>
      </div>
    </div>
  )
}

function CalendarTab({
  instances,
  patterns,
  patternAssignments,
  onRangeChange,
  onSelectInstance,
  includeCancelled,
  includeCompleted,
  onToggleCancelled,
  onToggleCompleted,
}: {
  instances: ShiftInstance[]
  patterns: ShiftPattern[]
  patternAssignments: ShiftPatternAssignment[]
  onRangeChange: (from: string, to: string) => void
  onSelectInstance: (instance: ShiftInstance) => void
  includeCancelled: boolean
  includeCompleted: boolean
  onToggleCancelled: (checked: boolean) => void
  onToggleCompleted: (checked: boolean) => void
}) {
  const [calendarView, setCalendarView] = React.useState<View>(Views.WEEK)
  const [calendarDate, setCalendarDate] = React.useState(() => new Date())
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])

  const assignmentsByPatternId = React.useMemo(() => {
    const map = new Map<string, ShiftPatternAssignment[]>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      const existing = map.get(assignment.shiftPatternId) ?? []
      existing.push(assignment)
      map.set(assignment.shiftPatternId, existing)
    }
    return map
  }, [patternAssignments])

  const patternById = React.useMemo(() => {
    const map = new Map<string, ShiftPattern>()
    for (const pattern of patterns) map.set(pattern.id, pattern)
    return map
  }, [patterns])

  const visibleInstances = React.useMemo(
    () =>
      instances.filter((instance) => {
        if (instance.status === ShiftInstanceStatus.CANCELLED) return includeCancelled
        if (instance.status === ShiftInstanceStatus.COMPLETED) return includeCompleted
        return instance.status === ShiftInstanceStatus.SCHEDULED || instance.status === ShiftInstanceStatus.MODIFIED
      }),
    [includeCancelled, includeCompleted, instances],
  )

  const events = React.useMemo<CalendarEvent[]>(
    () =>
      visibleInstances.map((instance) => {
        const activeAssignments = instance.patternId
          ? assignmentsByPatternId.get(instance.patternId) ?? []
          : []
        const names = activeAssignments.map(
          (assignment) => employeeByMembershipId.get(assignment.employeeMembershipId) ?? shortId(assignment.employeeMembershipId),
        )
        const assignmentSummary =
          names.length === 0
            ? "Unassigned"
            : names.length === 1
              ? names[0]
              : `${names[0]} +${names.length - 1}`
        return {
          id: instance.id,
          title: assignmentSummary,
          start: new Date(instance.startAt),
          end: new Date(instance.endAt),
          instance,
          assignmentSummary,
          assignedNames: names,
          patternName: instance.patternId
            ? patternById.get(instance.patternId)?.name ?? shortId(instance.patternId)
            : "",
        }
      }),
    [assignmentsByPatternId, employeeByMembershipId, patternById, visibleInstances],
  )

  const handleRangeChange = React.useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      const dates = Array.isArray(range) ? range : [range.start, range.end]
      const from = new Date(Math.min(...dates.map((date) => date.getTime())))
      const to = new Date(Math.max(...dates.map((date) => date.getTime())))
      onRangeChange(toIsoDate(from), toIsoDate(to))
    },
    [onRangeChange],
  )

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription className="text-[13px] uppercase tracking-[0.12em]">Scheduling</CardDescription>
          <CardTitle>Calendar</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeCancelled} onChange={(e) => onToggleCancelled(e.target.checked)} />
            Show cancelled
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeCompleted} onChange={(e) => onToggleCompleted(e.target.checked)} />
            Show completed
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="scheduling-calendar h-[680px] rounded-md border border-border bg-background p-2">
          <Calendar<CalendarEvent>
            localizer={calendarLocalizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            view={calendarView}
            date={calendarDate}
            onView={setCalendarView}
            onNavigate={setCalendarDate}
            popup
            onRangeChange={handleRangeChange}
            onSelectEvent={(event) => onSelectInstance(event.instance)}
            components={{
              event: ({ event }) => <CalendarEventCard event={event} />,
            }}
            eventPropGetter={(event) => {
              const colors = getCalendarEventColors(event)
              return {
                className: "scheduling-calendar-event",
                style: {
                  "--event-bg": colors.background,
                  "--event-border": colors.border,
                  "--event-fg": colors.foreground,
                  "--event-muted": colors.muted,
                  "--event-hover": colors.hover,
                } as React.CSSProperties,
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricTile({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
}: {
  label: string
  value: string
  sub: string
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className={cn("operations-metric", `operations-metric-${tone}`)}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardDescription className="operations-label">{label}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </CardTitle>
        </div>
        <span className="operations-metric-icon" aria-hidden="true">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

function ExceptionRow({ exception }: { exception: AttendanceException }) {
  return (
    <div className="review-exception-row">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate font-mono text-[12px] text-foreground">{exception.code}</span>
        <span className="shrink-0 text-[12px] uppercase text-muted-foreground">{exception.severity}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{exception.message}</p>
    </div>
  )
}

function CoverageLedger({
  instances,
  patternAssignments,
  rangeStart,
}: {
  instances: ShiftInstance[]
  patternAssignments: ShiftPatternAssignment[]
  rangeStart: string
}) {
  const activeAssignmentCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      counts.set(assignment.shiftPatternId, (counts.get(assignment.shiftPatternId) ?? 0) + 1)
    }
    return counts
  }, [patternAssignments])
  const start = React.useMemo(() => {
    const [year, month, day] = rangeStart.split("-").map(Number)
    return year && month && day ? new Date(year, month - 1, day) : new Date()
  }, [rangeStart])
  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        return date
      }),
    [start],
  )

  return (
    <Card className="coverage-ledger-card">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription className="operations-label">Coverage ledger</CardDescription>
          <CardTitle className="text-base font-medium">Next visible days</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="coverage-dot coverage-dot-covered" /> Covered</span>
          <span className="inline-flex items-center gap-1.5"><span className="coverage-dot coverage-dot-gap" /> Gap</span>
          <span className="inline-flex items-center gap-1.5"><span className="coverage-dot coverage-dot-quiet" /> No shifts</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="coverage-ledger-grid">
          {days.map((date) => {
            const iso = toIsoDate(date)
            const dayInstances = instances.filter((instance) => instance.shiftDate === iso)
            const activeInstances = dayInstances.filter(
              (instance) =>
                instance.status === ShiftInstanceStatus.SCHEDULED ||
                instance.status === ShiftInstanceStatus.MODIFIED,
            )
            const unassigned = activeInstances.filter(
              (instance) =>
                !instance.patternId || (activeAssignmentCounts.get(instance.patternId) ?? 0) === 0,
            ).length
            const tone =
              activeInstances.length === 0
                ? "quiet"
                : unassigned > 0
                  ? "gap"
                  : "covered"

            return (
              <div key={iso} className={cn("coverage-ledger-day", `coverage-ledger-day-${tone}`)}>
                <div className="coverage-ledger-date">
                  <span>{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <strong>{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>
                </div>
                <div className="coverage-ledger-counts">
                  <span>{activeInstances.length} shifts</span>
                  <span>{unassigned} gaps</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewQueue({
  sessions,
  exceptions,
}: {
  sessions: WorkSession[]
  exceptions: AttendanceException[]
}) {
  const dispatch = useAppDispatch()
  const isReviewing = useAppSelector((s) => s.attendance.status.review === "loading")
  const reviewConfirm = useAppSelector((s) => s.attendance.confirmSessionReview)
  const pendingSessions = sessions.filter(
    (session) =>
      session.status === WorkSessionStatus.PENDING_REVIEW ||
      session.status === WorkSessionStatus.CLOCKED_OUT ||
      session.hasExceptions ||
      session.reviewStatus === "REQUIRED",
  )
  const approvedSessions = sessions.filter((session) => session.status === WorkSessionStatus.APPROVED)

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

  const reviewCopy = {
    approve: {
      heading: "Approve session",
      description: "Approve this work session? The employee's recorded time will be marked as approved.",
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
      description: "Lock this work session? Locked sessions are finalized and can no longer be edited.",
      confirmLabel: "Lock session",
      confirmVariant: "destructive" as const,
    },
  }

  return (
    <Card className="review-queue-card min-w-0">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription className="operations-label">Review queue</CardDescription>
          <CardTitle className="text-base font-medium">Attendance needs attention</CardTitle>
        </div>
        <div className="text-[12px] text-muted-foreground tabular-nums">
          {approvedSessions.length} approved can lock
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        <div className="review-queue-section">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Pending sessions</span>
            <span className="text-[12px] text-muted-foreground tabular-nums">{pendingSessions.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingSessions.length > 0 ? (
              pendingSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="review-session-row">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{shortId(session.employeeMembershipId)}</div>
                    <div className="text-[12px] text-muted-foreground tabular-nums">
                      {formatDateTime(session.actualClockInAt)}
                    </div>
                  </div>
                  <div className="review-session-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch(openSessionReviewConfirm({ action: "approve", session }))}
                      disabled={isReviewing || session.status === WorkSessionStatus.APPROVED}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch(openSessionReviewConfirm({ action: "reject", session }))}
                      disabled={isReviewing}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No pending sessions in the latest organization feed.</p>
                {approvedSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="review-session-row">
                    <span className="truncate text-[13px] font-medium">{shortId(session.employeeMembershipId)}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch(openSessionReviewConfirm({ action: "lock", session }))}
                      disabled={isReviewing}
                    >
                      Lock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="review-queue-section">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Open exceptions</span>
            <span className="text-[12px] text-muted-foreground tabular-nums">{exceptions.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {exceptions.length > 0 ? (
              exceptions.slice(0, 5).map((exception) => (
                <ExceptionRow key={exception.id} exception={exception} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open exceptions are waiting for review.</p>
            )}
          </div>
        </div>
      </CardContent>
      {reviewConfirm.action && reviewConfirm.session && (
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
      )}
    </Card>
  )
}

const Scheduling = ({ view = "coverage" }: { view?: SchedulingView }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const patterns = useAppSelector((s) => s.scheduling.patterns)
  const instances = useAppSelector((s) => s.scheduling.instances)
  const patternAssignments = useAppSelector((s) => s.scheduling.patternAssignments)
  const instancesPage = useAppSelector((s) => s.scheduling.instancesPage)
  const patternAssignmentsPage = useAppSelector((s) => s.scheduling.patternAssignmentsPage)
  const statusInstancesPage = useAppSelector((s) => s.scheduling.status.instancesPage)
  const statusPatternAssignmentsPage = useAppSelector((s) => s.scheduling.status.patternAssignmentsPage)
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const cancelInstanceConfirm = useAppSelector((s) => s.scheduling.confirmCancelInstance)
  const removeAssignmentConfirm = useAppSelector((s) => s.scheduling.confirmRemoveAssignment)
  const isCancellingInstance = useAppSelector((s) => s.scheduling.status.cancelInstance === "loading")
  const isRemovingAssignment = useAppSelector(
    (s) => s.scheduling.status.cancelPatternAssignment === "loading",
  )
  const dayClockIns = useAppSelector((s) => s.attendance.dayClockIns)
  const statusDayClockIns = useAppSelector((s) => s.attendance.status.dayClockIns)

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })

  // Reset to the first page when switching between the setup views, since the
  // component instance persists across /scheduling/shifts <-> /scheduling/assignments.
  // Storing the previous view in state and adjusting during render is React's
  // recommended pattern for resetting state on a prop change.
  const [previousView, setPreviousView] = React.useState(view)
  if (previousView !== view) {
    setPreviousView(view)
    if (pagination.pageIndex !== 0) {
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }
  const [overrideTarget, setOverrideTarget] = React.useState<ShiftInstance | null>(null)
  const [calendarRange, setCalendarRange] = React.useState(() => {
    const today = new Date()
    const from = new Date(today)
    const to = new Date(today)
    to.setDate(today.getDate() + 35)
    return { from: toIsoDate(from), to: toIsoDate(to) }
  })
  const [includeCancelled, setIncludeCancelled] = React.useState(false)
  const [includeCompleted, setIncludeCompleted] = React.useState(false)
  const [clockInDay, setClockInDay] = React.useState<Date>(() => new Date())

  React.useEffect(() => {
    dispatch(fetchPatterns())
    dispatch(fetchPatternAssignments())
    dispatch(fetchInstances({ statuses: [ShiftInstanceStatus.SCHEDULED, ShiftInstanceStatus.MODIFIED].join(",") }))
    dispatch(fetchEmployees())
    dispatch(fetchOrgSessions())
    dispatch(fetchExceptions())
  }, [dispatch])

  React.useEffect(() => {
    const params = { page: pagination.pageIndex + 1, pageSize: pagination.pageSize }
    if (view === "shifts") dispatch(fetchInstancesPage(params))
    else if (view === "assignments") dispatch(fetchPatternAssignmentsPage(params))
  }, [dispatch, view, pagination.pageIndex, pagination.pageSize])

  const calendarStatuses = React.useMemo(() => {
    const statuses: ShiftInstanceStatus[] = [
      ShiftInstanceStatus.SCHEDULED,
      ShiftInstanceStatus.MODIFIED,
      ShiftInstanceStatus.CANCELLED,
      ShiftInstanceStatus.COMPLETED,
    ]
    return statuses.join(",")
  }, [])

  React.useEffect(() => {
    if (view !== "coverage") return
    dispatch(
      fetchInstances({
        from: calendarRange.from,
        to: calendarRange.to,
        statuses: calendarStatuses,
        pageSize: 500,
      }),
    )
  }, [view, calendarRange.from, calendarRange.to, calendarStatuses, dispatch])

  const clockInDayIso = toIsoDate(clockInDay)
  React.useEffect(() => {
    if (view !== "clock-ins") return
    const [y, m, d] = clockInDayIso.split("-").map(Number)
    const from = new Date(y, m - 1, d, 0, 0, 0, 0)
    const to = new Date(y, m - 1, d, 23, 59, 59, 999)
    dispatch(fetchDayClockIns({ from: from.toISOString(), to: to.toISOString() }))
  }, [view, clockInDayIso, dispatch])

  const openSessionDetail = React.useCallback(
    (session: WorkSession) => {
      navigate(`/scheduling/clock-ins/${session.id}`)
    },
    [navigate],
  )

  const handleCalendarRangeChange = React.useCallback((from: string, to: string) => {
    setCalendarRange((current) =>
      current.from === from && current.to === to ? current : { from, to },
    )
  }, [])

  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])

  const patternsById = React.useMemo(() => {
    const map = new Map<string, ShiftPattern>()
    for (const pattern of patterns) map.set(pattern.id, pattern)
    return map
  }, [patterns])

  const assignedEmployeeCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      counts.set(assignment.shiftPatternId, (counts.get(assignment.shiftPatternId) ?? 0) + 1)
    }
    return counts
  }, [patternAssignments])

  const coverageMetrics = React.useMemo(() => {
    const activeInstances = instances.filter(
      (instance) =>
        instance.status === ShiftInstanceStatus.SCHEDULED ||
        instance.status === ShiftInstanceStatus.MODIFIED,
    )
    const unassigned = activeInstances.filter(
      (instance) =>
        !instance.patternId || (assignedEmployeeCounts.get(instance.patternId) ?? 0) === 0,
    ).length
    const modifiedOrCancelled = instances.filter(
      (instance) =>
        instance.status === ShiftInstanceStatus.MODIFIED ||
        instance.status === ShiftInstanceStatus.CANCELLED,
    ).length
    const openSessions = orgSessions.filter((session) => session.status === WorkSessionStatus.OPEN).length

    return [
      {
        label: "Scheduled",
        value: String(activeInstances.length),
        sub: `${calendarRange.from} to ${calendarRange.to}`,
        tone: "info" as const,
        icon: CalendarRange,
      },
      {
        label: "Coverage gaps",
        value: String(unassigned),
        sub: unassigned === 0 ? "all visible shifts assigned" : "unassigned shifts",
        tone: unassigned === 0 ? "success" as const : "warning" as const,
        icon: UsersRound,
      },
      {
        label: "Changed",
        value: String(modifiedOrCancelled),
        sub: "modified or cancelled",
        tone: modifiedOrCancelled === 0 ? "neutral" as const : "warning" as const,
        icon: ListChecks,
      },
      {
        label: "On duty",
        value: String(openSessions),
        sub: "open clock sessions",
        tone: "success" as const,
        icon: Activity,
      },
      {
        label: "Exceptions",
        value: String(exceptions.length),
        sub: "open policy flags",
        tone: exceptions.length === 0 ? "neutral" as const : "danger" as const,
        icon: AlertTriangle,
      },
    ]
  }, [assignedEmployeeCounts, calendarRange.from, calendarRange.to, exceptions.length, instances, orgSessions])

  const refreshInstances = () => {
    dispatch(fetchInstances({}))
    dispatch(fetchInstancesPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
  }

  const handleConfirmCancelInstance = async () => {
    const target = cancelInstanceConfirm.target
    if (!target) return
    try {
      await dispatch(cancelInstance(target.id)).unwrap()
      refreshInstances()
      if (overrideTarget?.id === target.id) setOverrideTarget(null)
      dispatch(closeCancelInstanceConfirm())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const handleConfirmRemoveAssignment = async () => {
    const target = removeAssignmentConfirm.target
    if (!target) return
    try {
      await dispatch(cancelPatternAssignment(target.id)).unwrap()
      dispatch(fetchPatternAssignments())
      dispatch(
        fetchPatternAssignmentsPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }),
      )
      dispatch(closeRemoveAssignmentConfirm())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const instanceColumns: ColumnDef<ShiftInstance>[] = React.useMemo(
    () => [
      {
        accessorKey: "shiftDate",
        header: "Date",
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums">{formatDateISO(getValue<string>())}</span>
        ),
        meta: { width: "10rem", cellClassName: "py-3" },
      },
      {
        id: "shift",
        header: "Shift",
        cell: ({ row }) => (
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {formatTime(row.original.startAt)} – {formatTime(row.original.endAt)}
          </span>
        ),
        meta: { width: "12rem", cellClassName: "py-3" },
      },
      {
        id: "pattern",
        header: "Pattern",
        cell: ({ row }) => {
          const patternId = row.original.patternId
          if (!patternId) return <span className="text-[13px] text-muted-foreground">—</span>
          const pattern = patternsById.get(patternId)
          if (!pattern) return <span className="text-[13px] text-muted-foreground">{shortId(patternId)}</span>
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">{pattern.name}</span>
              <span className="text-[12px] text-muted-foreground">
                {daysLabel(pattern.daysOfWeek)} · {assignedEmployeeCounts.get(pattern.id) ?? 0} assigned
              </span>
            </div>
          )
        },
        meta: { width: "16rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<ShiftInstanceStatus>()
          return (
            <span
              className={`inline-flex h-6 items-center border px-2 text-[13px] font-normal uppercase ${instanceStatusClass[status]}`}
            >
              {status}
            </span>
          )
        },
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const instance = row.original
          if (instance.status === ShiftInstanceStatus.CANCELLED || instance.status === ShiftInstanceStatus.COMPLETED) {
            return null
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Row actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setOverrideTarget(instance)}>
                  Override times…
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => dispatch(openCancelInstanceConfirm(instance))}>
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        meta: { align: "right", width: "4rem", cellClassName: "py-3" },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignedEmployeeCounts, patternsById],
  )

  const assignmentColumns: ColumnDef<ShiftPatternAssignment>[] = React.useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Assignment",
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-muted-foreground">{shortId(getValue<string>())}</span>
        ),
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "shiftPatternId",
        header: "Shift pattern",
        cell: ({ getValue }) => {
          const patternId = getValue<string>()
          const pattern = patternsById.get(patternId)
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">{pattern?.name ?? "Unknown pattern"}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{shortId(patternId)}</span>
            </div>
          )
        },
        meta: { width: "15rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "employeeMembershipId",
        header: "Employee",
        cell: ({ getValue }) => {
          const membershipId = getValue<string>()
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">
                {employeeByMembershipId.get(membershipId) ?? "Unknown employee"}
              </span>
              <span className="font-mono text-[12px] text-muted-foreground">{shortId(membershipId)}</span>
            </div>
          )
        },
        meta: { width: "15rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<ShiftAssignmentStatus>()
          return (
            <span
              className={`inline-flex h-6 items-center border px-2 text-[13px] font-normal uppercase ${assignmentStatusClass[status]}`}
            >
              {status}
            </span>
          )
        },
        meta: { align: "right", width: "10rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">
            {new Date(getValue<string>()).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
        meta: { align: "right", width: "9rem", cellClassName: "py-3" },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const assignment = row.original
          if (assignment.status !== ShiftAssignmentStatus.ACTIVE) {
            return null
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Row actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => dispatch(openRemoveAssignmentConfirm(assignment))}>
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        meta: { align: "right", width: "4rem", cellClassName: "py-3" },
      },
    ],
    [dispatch, employeeByMembershipId, patternsById],
  )

  const clockInColumns: ColumnDef<WorkSession>[] = React.useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">
              {employeeByMembershipId.get(row.original.employeeMembershipId) ??
                shortId(row.original.employeeMembershipId)}
            </span>
            <span className="font-mono text-[12px] text-muted-foreground">
              {shortId(row.original.employeeMembershipId)}
            </span>
          </div>
        ),
        meta: { width: "16rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "actualClockInAt",
        header: "Clock in",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-[13px]">{formatTime(getValue<string>())}</span>
        ),
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "actualClockOutAt",
        header: "Clock out",
        cell: ({ getValue }) => {
          const value = getValue<string | null>()
          return (
            <span className="tabular-nums text-[13px]">
              {value ? formatTime(value) : <span className="text-muted-foreground">Open</span>}
            </span>
          )
        },
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        id: "hours",
        header: "Hours",
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-muted-foreground">
            {row.original.actualClockOutAt
              ? formatDuration(row.original.actualClockInAt, row.original.actualClockOutAt)
              : "—"}
          </span>
        ),
        meta: { align: "right", width: "8rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <span className="inline-flex h-6 items-center border border-border px-2 text-[13px] uppercase text-muted-foreground">
            {getValue<WorkSessionStatus>().replaceAll("_", " ")}
          </span>
        ),
        meta: { align: "right", width: "11rem", cellClassName: "py-3" },
      },
      {
        id: "exceptions",
        header: "Flags",
        cell: ({ row }) =>
          row.original.exceptionCount > 0 ? (
            <span className="inline-flex h-6 items-center border border-warning/25 bg-warning/10 px-2 text-[13px] text-warning tabular-nums">
              {row.original.exceptionCount}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          ),
        meta: { align: "right", width: "6rem", cellClassName: "py-3" },
      },
    ],
    [employeeByMembershipId],
  )

  const isLoadingCurrent =
    view === "assignments"
      ? statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length === 0
      : statusInstancesPage === "loading" && instancesPage.data.length === 0

  const isFetchingCurrent =
    view === "assignments"
      ? statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length > 0
      : statusInstancesPage === "loading" && instancesPage.data.length > 0

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
                <div className="operations-label">Admin command center</div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Scheduling coverage</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan staffing gaps, live sessions, and policy flags before opening setup records.
                </p>
              </div>
            </div>

            {view === "coverage" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {coverageMetrics.map((metric) => (
                    <MetricTile key={metric.label} {...metric} />
                  ))}
                </div>

                <CoverageLedger
                  instances={instances}
                  patternAssignments={patternAssignments}
                  rangeStart={calendarRange.from}
                />

                <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_28rem]">
                  <div className="min-w-0">
                    <CalendarTab
                      instances={instances}
                      patterns={patterns}
                      patternAssignments={patternAssignments}
                      onRangeChange={handleCalendarRangeChange}
                      onSelectInstance={setOverrideTarget}
                      includeCancelled={includeCancelled}
                      includeCompleted={includeCompleted}
                      onToggleCancelled={setIncludeCancelled}
                      onToggleCompleted={setIncludeCompleted}
                    />
                  </div>
                  <div className="min-w-0">
                    <ReviewQueue sessions={orgSessions} exceptions={exceptions} />
                  </div>
                </div>
              </>
            )}

            {view === "clock-ins" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <div className="operations-label">Attendance</div>
                    <h2 className="text-base font-medium text-foreground">Clock-ins for the day</h2>
                  </div>
                  <div className="w-56">
                    <DatePicker
                      value={clockInDay}
                      onChange={(date) => date && setClockInDay(date)}
                      placeholder="Select day"
                    />
                  </div>
                </div>

                <DataTable
                  eyebrow="Attendance"
                  title="Clock-ins"
                  description="Every clock-in recorded on the selected day. Open a row for the full capture detail."
                  columns={clockInColumns}
                  data={dayClockIns}
                  tableClassName="min-w-[820px]"
                  getRowId={(session) => session.id}
                  onRowClick={(row) => openSessionDetail(row.original)}
                  hidePagination
                  isLoading={statusDayClockIns === "loading" && dayClockIns.length === 0}
                  isFetching={statusDayClockIns === "loading" && dayClockIns.length > 0}
                  emptyTitle="No clock-ins"
                  emptyDescription="No one clocked in on the selected day."
                />
              </>
            )}

            {(view === "shifts" || view === "assignments") && (
              <>
                <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border pb-2">
                  <div className="flex gap-2">
                    <NewShiftDialog
                      onCreated={() => {
                        dispatch(fetchPatterns())
                        refreshInstances()
                      }}
                    />
                    <AssignEmployeeDialog
                      onCreated={() => {
                        dispatch(fetchPatternAssignments())
                        dispatch(
                          fetchPatternAssignmentsPage({
                            page: pagination.pageIndex + 1,
                            pageSize: pagination.pageSize,
                          }),
                        )
                      }}
                    />
                  </div>
                </div>

                {view === "shifts" && (
                  <DataTable
                    eyebrow="Setup"
                    title="Generated shifts"
                    columns={instanceColumns}
                    data={instancesPage.data}
                    tableClassName="min-w-[820px]"
                    getRowId={(i) => i.id}
                    pagination={pagination}
                    paginationInfo={{
                      page: instancesPage.page,
                      pageSize: instancesPage.pageSize || pagination.pageSize,
                      total: instancesPage.total,
                    }}
                    onPaginationChange={setPagination}
                    rowCount={instancesPage.total}
                    pageSizeOptions={[8, 16, 32]}
                    syncPaginationFromInfo
                    isLoading={isLoadingCurrent}
                    isFetching={isFetchingCurrent}
                    emptyTitle="No generated shifts"
                    emptyDescription="Create a pattern to generate shifts for your team."
                  />
                )}

                {view === "assignments" && (
                  <DataTable
                    eyebrow="Setup"
                    title="Pattern assignments"
                    columns={assignmentColumns}
                    data={patternAssignmentsPage.data}
                    tableClassName="min-w-[760px]"
                    getRowId={(a) => a.id}
                    pagination={pagination}
                    paginationInfo={{
                      page: patternAssignmentsPage.page,
                      pageSize: patternAssignmentsPage.pageSize || pagination.pageSize,
                      total: patternAssignmentsPage.total,
                    }}
                    onPaginationChange={setPagination}
                    rowCount={patternAssignmentsPage.total}
                    pageSizeOptions={[8, 16, 32]}
                    syncPaginationFromInfo
                    isLoading={isLoadingCurrent}
                    isFetching={isFetchingCurrent}
                    emptyTitle="No assignments yet"
                    emptyDescription="Assign employees to shift patterns to start covering the schedule."
                  />
                )}
              </>
            )}

            <ShiftDetailsDialog
              instance={overrideTarget}
              patterns={patterns}
              patternAssignments={patternAssignments}
              open={overrideTarget !== null}
              onOpenChange={(o) => {
                if (!o) setOverrideTarget(null)
              }}
              onDone={() => {
                refreshInstances()
                setOverrideTarget(null)
              }}
            />

            <ConfirmationModal
              isOpen={cancelInstanceConfirm.isOpen}
              onClose={() => dispatch(closeCancelInstanceConfirm())}
              onConfirm={handleConfirmCancelInstance}
              isLoading={isCancellingInstance}
              heading="Cancel shift"
              description="Cancel this shift? Employees assigned to it will no longer be scheduled."
              confirmLabel="Cancel shift"
            />

            <ConfirmationModal
              isOpen={removeAssignmentConfirm.isOpen}
              onClose={() => dispatch(closeRemoveAssignmentConfirm())}
              onConfirm={handleConfirmRemoveAssignment}
              isLoading={isRemovingAssignment}
              heading="Remove assignment"
              description="Remove this employee from the shift pattern? They will no longer be assigned to its shifts."
              confirmLabel="Remove assignment"
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Scheduling
