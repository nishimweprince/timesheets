"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { Calendar, Views, momentLocalizer } from "react-big-calendar"
import moment from "moment"
import { MoreHorizontal } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Modal from "@/components/reusable/cards/Modal"
import Combobox from "@/components/reusable/inputs/Combobox"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import { DataTable } from "@/components/reusable/tables"
import { cn } from "@/lib/utils"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import {
  cancelInstance,
  createPatternAssignment,
  createPattern,
  fetchPatternAssignments,
  fetchPatternAssignmentsPage,
  fetchInstances,
  fetchInstancesPage,
  fetchPatterns,
  overrideInstance,
} from "@/states/features/scheduling.slice"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftPatternAssignment,
  type ShiftInstance,
  type ShiftPattern,
} from "@/lib/api/scheduling.api"
import { showApiErrorToast } from "@/lib/api/errors"

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

// --- Tab types ---

type Tab = "patterns" | "assignments" | "calendar"

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

// --- Override instance dialog ---

function OverrideInstanceDialog({
  instance,
  open,
  onOpenChange,
  onDone,
}: {
  instance: ShiftInstance | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  if (!instance) return null

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      heading="Override shift times"
      className="sm:min-w-0 sm:max-w-sm"
    >
      <OverrideInstanceForm
        key={instance.id}
        instance={instance}
        onOpenChange={onOpenChange}
        onDone={onDone}
      />
    </Modal>
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

const tabItems: { key: Tab; label: string }[] = [
  { key: "patterns", label: "Patterns" },
  { key: "assignments", label: "Assignments" },
  { key: "calendar", label: "Calendar" },
]

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  instance: ShiftInstance
  assignmentSummary: string
}

function CalendarTab({
  instances,
  patternAssignments,
  onRangeChange,
  onSelectInstance,
  includeCancelled,
  includeCompleted,
  onToggleCancelled,
  onToggleCompleted,
}: {
  instances: ShiftInstance[]
  patternAssignments: ShiftPatternAssignment[]
  onRangeChange: (from: string, to: string) => void
  onSelectInstance: (instance: ShiftInstance) => void
  includeCancelled: boolean
  includeCompleted: boolean
  onToggleCancelled: (checked: boolean) => void
  onToggleCompleted: (checked: boolean) => void
}) {
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

  const events = React.useMemo<CalendarEvent[]>(
    () =>
      instances.map((instance) => {
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
        }
      }),
    [assignmentsByPatternId, employeeByMembershipId, instances],
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
        <div className="h-[680px] rounded-md border border-border bg-background p-2">
          <Calendar<CalendarEvent>
            localizer={calendarLocalizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            defaultView={Views.WEEK}
            popup
            onRangeChange={handleRangeChange}
            onSelectEvent={(event) => onSelectInstance(event.instance)}
            components={{
              event: ({ event }) => (
                <div className="truncate">
                  <span className="font-medium">{event.assignmentSummary}</span>
                  <span className="ml-1 opacity-80">· {event.instance.status}</span>
                </div>
              ),
            }}
            eventPropGetter={(event) => ({
              className: event.assignmentSummary !== "Unassigned"
                ? "border border-primary/20"
                : "border border-warning/30",
              style: {
                backgroundColor:
                  event.instance.status === ShiftInstanceStatus.CANCELLED
                    ? "hsl(var(--muted))"
                    : event.instance.status === ShiftInstanceStatus.COMPLETED
                      ? "hsl(var(--primary))"
                      : event.assignmentSummary !== "Unassigned"
                        ? "hsl(var(--success))"
                        : "hsl(var(--warning))",
              },
            })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

const Scheduling = () => {
  const dispatch = useAppDispatch()

  const patterns = useAppSelector((s) => s.scheduling.patterns)
  const instances = useAppSelector((s) => s.scheduling.instances)
  const patternAssignments = useAppSelector((s) => s.scheduling.patternAssignments)
  const instancesPage = useAppSelector((s) => s.scheduling.instancesPage)
  const patternAssignmentsPage = useAppSelector((s) => s.scheduling.patternAssignmentsPage)
  const statusInstancesPage = useAppSelector((s) => s.scheduling.status.instancesPage)
  const statusPatternAssignmentsPage = useAppSelector((s) => s.scheduling.status.patternAssignmentsPage)

  const [activeTab, setActiveTab] = React.useState<Tab>("patterns")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })
  const [overrideTarget, setOverrideTarget] = React.useState<ShiftInstance | null>(null)
  const [calendarRange, setCalendarRange] = React.useState(() => {
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 7)
    const to = new Date(today)
    to.setDate(today.getDate() + 35)
    return { from: toIsoDate(from), to: toIsoDate(to) }
  })
  const [includeCancelled, setIncludeCancelled] = React.useState(false)
  const [includeCompleted, setIncludeCompleted] = React.useState(false)

  React.useEffect(() => {
    dispatch(fetchPatterns())
    dispatch(fetchPatternAssignments())
    dispatch(fetchInstances({ statuses: [ShiftInstanceStatus.SCHEDULED, ShiftInstanceStatus.MODIFIED].join(",") }))
    dispatch(fetchEmployees())
  }, [dispatch])

  React.useEffect(() => {
    const params = { page: pagination.pageIndex + 1, pageSize: pagination.pageSize }
    if (activeTab === "patterns") dispatch(fetchInstancesPage(params))
    else if (activeTab === "assignments") dispatch(fetchPatternAssignmentsPage(params))
  }, [dispatch, activeTab, pagination.pageIndex, pagination.pageSize])

  const calendarStatuses = React.useMemo(() => {
    const statuses: ShiftInstanceStatus[] = [ShiftInstanceStatus.SCHEDULED, ShiftInstanceStatus.MODIFIED]
    if (includeCancelled) statuses.push(ShiftInstanceStatus.CANCELLED)
    if (includeCompleted) statuses.push(ShiftInstanceStatus.COMPLETED)
    return statuses.join(",")
  }, [includeCancelled, includeCompleted])

  React.useEffect(() => {
    if (activeTab !== "calendar") return
    dispatch(
      fetchInstances({
        from: calendarRange.from,
        to: calendarRange.to,
        statuses: calendarStatuses,
        pageSize: 500,
      }),
    )
  }, [activeTab, calendarRange.from, calendarRange.to, calendarStatuses, dispatch])

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

  const summaryCards = React.useMemo(
    () => [
      { label: "Patterns", value: String(patterns.length), sub: "shift patterns" },
      { label: "Assignments", value: String(patternAssignments.length), sub: "pattern assignments" },
    ],
    [patterns.length, patternAssignments.length],
  )

  const refreshInstances = () => {
    dispatch(fetchInstances())
    dispatch(fetchInstancesPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
  }

  const handleCancel = async (instance: ShiftInstance) => {
    try {
      await dispatch(cancelInstance(instance.id)).unwrap()
      refreshInstances()
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
                <DropdownMenuItem onSelect={() => handleCancel(instance)}>
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
          <span className="font-mono text-[13px] text-muted-foreground">{shortId(getValue<string>())}</span>
        ),
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "shiftPatternId",
        header: "Shift pattern",
        cell: ({ getValue }) => (
          <span className="font-mono text-[13px] text-muted-foreground">{shortId(getValue<string>())}</span>
        ),
        meta: { width: "8rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "employeeMembershipId",
        header: "Employee",
        cell: ({ getValue }) => (
          <span className="font-mono text-[13px] text-muted-foreground">{shortId(getValue<string>())}</span>
        ),
        meta: { width: "8rem", cellClassName: "py-3" },
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
    ],
    [],
  )

  const isLoadingCurrent =
    activeTab === "patterns"
      ? statusInstancesPage === "loading" && instancesPage.data.length === 0
      : statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length === 0

  const isFetchingCurrent =
    activeTab === "patterns"
      ? statusInstancesPage === "loading" && instancesPage.data.length > 0
      : statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length > 0

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
            <div className="grid gap-4 sm:grid-cols-2">
              {summaryCards.map((m, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
                      {m.label}
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold tabular-nums tracking-tighter">
                      {m.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[13px] text-muted-foreground">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-1 border-b border-border">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key)
                    setPagination((p) => ({ ...p, pageIndex: 0 }))
                  }}
                  className={[
                    "relative h-9 px-4 text-[13px] transition-colors",
                    activeTab === tab.key
                      ? "border-b-2 border-primary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "patterns" && (
              <DataTable
                eyebrow="Scheduling"
                title="Generated instances"
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
                emptyTitle="No generated instances"
                emptyDescription="Create a shift to schedule work for your team."
                actions={
                  <NewShiftDialog
                    onCreated={() => {
                      dispatch(fetchPatterns())
                      refreshInstances()
                    }}
                  />
                }
              />
            )}

            {activeTab === "assignments" && (
              <DataTable
                eyebrow="Scheduling"
                title="Shift assignments"
                columns={assignmentColumns}
                data={patternAssignmentsPage.data}
                tableClassName="min-w-[720px]"
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
                emptyDescription="Assign employees to shift patterns to get started."
                actions={
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
                }
              />
            )}

            {activeTab === "calendar" && (
              <CalendarTab
                instances={instances}
                patternAssignments={patternAssignments}
                onRangeChange={(from, to) => setCalendarRange({ from, to })}
                onSelectInstance={setOverrideTarget}
                includeCancelled={includeCancelled}
                includeCompleted={includeCompleted}
                onToggleCancelled={setIncludeCancelled}
                onToggleCompleted={setIncludeCompleted}
              />
            )}

            <OverrideInstanceDialog
              instance={overrideTarget}
              open={overrideTarget !== null}
              onOpenChange={(o) => {
                if (!o) setOverrideTarget(null)
              }}
              onDone={() => {
                refreshInstances()
                setOverrideTarget(null)
              }}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Scheduling
