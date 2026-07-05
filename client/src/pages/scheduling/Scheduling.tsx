"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
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
  createPatternAssignment,
  createPattern,
  fetchPatternAssignments,
  fetchPatternAssignmentsPage,
  fetchPatterns,
  fetchPatternsPage,
} from "@/states/features/scheduling.slice"
import {
  ShiftAssignmentStatus,
  type ShiftPatternAssignment,
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


const assignmentStatusClass: Record<ShiftAssignmentStatus, string> = {
  [ShiftAssignmentStatus.ACTIVE]: "border-success/20 bg-success/10 text-success",
  [ShiftAssignmentStatus.CANCELLED]: "border-border bg-muted text-muted-foreground",
  [ShiftAssignmentStatus.REASSIGNED]: "border-warning/25 bg-warning/10 text-warning",
}

// --- Tab types ---

type Tab = "shifts" | "assignments"

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
      await dispatch(createPatternAssignment({
        shiftPatternId,
        employeeMembershipId,
        ...(effectiveFrom ? { effectiveFrom: toIsoDate(effectiveFrom) } : {}),
        ...(effectiveUntil ? { effectiveUntil: toIsoDate(effectiveUntil) } : {}),
      })).unwrap()
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
              <DatePicker value={effectiveUntil} onChange={setEffectiveUntil} fromDate={effectiveFrom} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isLoading || !shiftPatternId || !employeeMembershipId}>
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
  { key: "shifts", label: "Shifts" },
  { key: "assignments", label: "Assignments" },
]

const Scheduling = () => {
  const dispatch = useAppDispatch()

  const patterns = useAppSelector((s) => s.scheduling.patterns)
  const patternAssignments = useAppSelector((s) => s.scheduling.patternAssignments)
  const patternsPage = useAppSelector((s) => s.scheduling.patternsPage)
  const patternAssignmentsPage = useAppSelector((s) => s.scheduling.patternAssignmentsPage)
  const statusPatternsPage = useAppSelector((s) => s.scheduling.status.patternsPage)
  const statusPatternAssignmentsPage = useAppSelector((s) => s.scheduling.status.patternAssignmentsPage)

  const [activeTab, setActiveTab] = React.useState<Tab>("shifts")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })

  React.useEffect(() => {
    dispatch(fetchPatterns())
    dispatch(fetchPatternAssignments())
  }, [dispatch])

  React.useEffect(() => {
    const params = { page: pagination.pageIndex + 1, pageSize: pagination.pageSize }
    if (activeTab === "shifts") dispatch(fetchPatternsPage(params))
    else dispatch(fetchPatternAssignmentsPage(params))
  }, [dispatch, activeTab, pagination.pageIndex, pagination.pageSize])


  const summaryCards = React.useMemo(
    () => [
      { label: "Shift patterns", value: String(patterns.length), sub: "active schedule templates" },
      { label: "Assignments", value: String(patternAssignments.length), sub: "pattern assignments" },
    ],
    [patterns.length, patternAssignments.length],
  )

  const assignedEmployeeCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      counts.set(assignment.shiftPatternId, (counts.get(assignment.shiftPatternId) ?? 0) + 1)
    }
    return counts
  }, [patternAssignments])


  const patternColumns: ColumnDef<ShiftPattern>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Pattern",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">{row.original.name}</span>
            <span className="text-[12px] text-muted-foreground">{daysLabel(row.original.daysOfWeek)}</span>
          </div>
        ),
        meta: { width: "18rem", cellClassName: "py-3" },
      },
      {
        id: "time",
        header: "Time",
        cell: ({ row }) => (
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {row.original.startTime} – {row.original.endTime}
          </span>
        ),
        meta: { width: "12rem", cellClassName: "py-3" },
      },
      {
        accessorKey: "effectiveFrom",
        header: "Effective",
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">
            {formatDateISO(row.original.effectiveFrom)}{row.original.effectiveUntil ? ` – ${formatDateISO(row.original.effectiveUntil)}` : ""}
          </span>
        ),
        meta: { width: "16rem", cellClassName: "py-3" },
      },
      {
        id: "assignedEmployees",
        header: "Assigned employees",
        cell: ({ row }) => (
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {assignedEmployeeCounts.get(row.original.id) ?? 0}
          </span>
        ),
        meta: { align: "right", width: "10rem", cellClassName: "py-3" },
      },
    ],
    [assignedEmployeeCounts],
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
    activeTab === "shifts"
      ? statusPatternsPage === "loading" && patternsPage.data.length === 0
      : statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length === 0

  const isFetchingCurrent =
    activeTab === "shifts"
      ? statusPatternsPage === "loading" && patternsPage.data.length > 0
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

            {activeTab === "shifts" && (
              <DataTable
                eyebrow="Scheduling"
                title="Shift patterns"
                columns={patternColumns}
                data={patternsPage.data}
                tableClassName="min-w-[720px]"
                getRowId={(i) => i.id}
                pagination={pagination}
                paginationInfo={{
                  page: patternsPage.page,
                  pageSize: patternsPage.pageSize || pagination.pageSize,
                  total: patternsPage.total,
                }}
                onPaginationChange={setPagination}
                rowCount={patternsPage.total}
                pageSizeOptions={[8, 16, 32]}
                syncPaginationFromInfo
                isLoading={isLoadingCurrent}
                isFetching={isFetchingCurrent}
                emptyTitle="No shift patterns"
                emptyDescription="Create a shift pattern to schedule recurring work for your team."
                actions={
                  <NewShiftDialog
                    onCreated={() => {
                      dispatch(fetchPatterns())
                      dispatch(fetchPatternsPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
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

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Scheduling
