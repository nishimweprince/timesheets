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
import Select from "@/components/reusable/inputs/Select"
import { DataTable } from "@/components/reusable/tables"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import {
  createAssignment,
  createInstance,
  createTemplate,
  fetchAssignments,
  fetchAssignmentsPage,
  fetchInstances,
  fetchInstancesPage,
  fetchTemplates,
  fetchTemplatesPage,
} from "@/states/features/scheduling.slice"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftAssignment,
  type ShiftInstance,
  type ShiftTemplate,
} from "@/lib/api/scheduling.api"
import { showApiErrorToast } from "@/lib/api/errors"

// --- helpers ---

function shortId(id: string) {
  return id.slice(0, 8)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function employeeName(employee: { firstName: string; lastName: string; email: string }) {
  const name = `${employee.firstName} ${employee.lastName}`.trim()
  return name || employee.email
}

// --- badge styles ---

const instanceStatusClass: Record<ShiftInstanceStatus, string> = {
  [ShiftInstanceStatus.SCHEDULED]: "border-success/20 bg-success/10 text-success",
  [ShiftInstanceStatus.CANCELLED]: "border-border bg-muted text-muted-foreground",
}

const assignmentStatusClass: Record<ShiftAssignmentStatus, string> = {
  [ShiftAssignmentStatus.ACTIVE]: "border-success/20 bg-success/10 text-success",
  [ShiftAssignmentStatus.CANCELLED]: "border-border bg-muted text-muted-foreground",
  [ShiftAssignmentStatus.REASSIGNED]: "border-warning/25 bg-warning/10 text-warning",
}

// --- column definitions ---

const templateColumns: ColumnDef<ShiftTemplate>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: "startTime",
    header: "Start",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<string>()}</span>,
    meta: { width: "7rem" },
  },
  {
    accessorKey: "endTime",
    header: "End",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<string>()}</span>,
    meta: { width: "7rem" },
  },
  {
    accessorKey: "timezone",
    header: "Timezone",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <span className="inline-flex h-6 items-center border border-success/20 bg-success/10 px-2 text-xs uppercase text-success">
          Active
        </span>
      ) : (
        <span className="inline-flex h-6 items-center border bg-muted px-2 text-xs uppercase text-muted-foreground">
          Inactive
        </span>
      ),
    meta: { align: "right", width: "8rem" },
  },
]

const instanceColumns: ColumnDef<ShiftInstance>[] = [
  {
    accessorKey: "startAt",
    header: "Date",
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">{formatDate(getValue<string>())}</span>
    ),
    meta: { width: "9rem" },
  },
  {
    id: "shift",
    header: "Shift",
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatTime(row.original.startAt)} – {formatTime(row.original.endAt)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<ShiftInstanceStatus>()
      return (
        <span
          className={`inline-flex h-6 items-center border px-2 text-xs font-normal uppercase ${instanceStatusClass[status]}`}
        >
          {status}
        </span>
      )
    },
    meta: { align: "right", width: "10rem" },
  },
]

const assignmentColumns: ColumnDef<ShiftAssignment>[] = [
  {
    accessorKey: "id",
    header: "Assignment",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">{shortId(getValue<string>())}</span>
    ),
    meta: { width: "8rem" },
  },
  {
    accessorKey: "shiftInstanceId",
    header: "Shift",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">{shortId(getValue<string>())}</span>
    ),
    meta: { width: "8rem" },
  },
  {
    accessorKey: "employeeMembershipId",
    header: "Employee",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">{shortId(getValue<string>())}</span>
    ),
    meta: { width: "8rem" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<ShiftAssignmentStatus>()
      return (
        <span
          className={`inline-flex h-6 items-center border px-2 text-xs font-normal uppercase ${assignmentStatusClass[status]}`}
        >
          {status}
        </span>
      )
    },
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ getValue }) => (
      <span className="tabular-nums text-muted-foreground">{formatDate(getValue<string>())}</span>
    ),
    meta: { align: "right", width: "9rem" },
  },
]

// --- Tab types ---

type Tab = "templates" | "shifts" | "assignments"

// --- Dialogs ---

function NewTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((s) => s.scheduling.status.createTemplate === "loading")

  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dispatch(createTemplate({ name, startTime, endTime })).unwrap()
      setOpen(false)
      setName("")
      setStartTime("")
      setEndTime("")
      onCreated()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" className="h-8 rounded-none text-xs" onClick={() => setOpen(true)}>
        New Template
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} heading="New shift template" className="sm:min-w-0 sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              required
              placeholder="e.g. Morning Ward"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Start time</Label>
              <Input
                required
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9 rounded-none text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">End time</Label>
              <Input
                required
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9 rounded-none text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-8 rounded-none text-xs" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create template"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function NewShiftDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const templates = useAppSelector((s) => s.scheduling.templates)
  const isLoading = useAppSelector((s) => s.scheduling.status.createInstance === "loading")

  const [open, setOpen] = React.useState(false)
  const [templateId, setTemplateId] = React.useState<string | undefined>(undefined)
  const [startAt, setStartAt] = React.useState("")
  const [endAt, setEndAt] = React.useState("")
  const templateOptions = React.useMemo(
    () => [
      { label: "No template", value: "none" },
      ...templates.map((template) => ({ label: template.name, value: template.id })),
    ],
    [templates],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dispatch(
        createInstance({
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          ...(templateId ? { shiftTemplateId: templateId } : {}),
        })
      ).unwrap()
      setOpen(false)
      setTemplateId(undefined)
      setStartAt("")
      setEndAt("")
      onCreated()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" className="h-8 rounded-none text-xs" onClick={() => setOpen(true)}>
        New Shift
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} heading="New shift" className="sm:min-w-0 sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {templates.length > 0 && (
            <Select
              label="Template (optional)"
              labelClassName="text-xs"
              className="h-9 text-sm"
              value={templateId ?? "none"}
              options={templateOptions}
              onChange={(v) => setTemplateId(v === "none" ? undefined : v)}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Start</Label>
            <Input
              required
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">End</Label>
            <Input
              required
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-8 rounded-none text-xs" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create shift"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function AssignEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const instances = useAppSelector((s) => s.scheduling.instances)
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const isLoading = useAppSelector((s) => s.scheduling.status.assign === "loading")

  const [open, setOpen] = React.useState(false)
  const [shiftInstanceId, setShiftInstanceId] = React.useState("")
  const [employeeMembershipId, setEmployeeMembershipId] = React.useState("")

  const scheduledInstances = React.useMemo(
    () => instances.filter((i) => i.status === ShiftInstanceStatus.SCHEDULED),
    [instances]
  )
  const shiftOptions = React.useMemo(
    () =>
      scheduledInstances.map((instance) => ({
        label: `${formatDate(instance.startAt)} ${formatTime(instance.startAt)} – ${formatTime(instance.endAt)}`,
        value: instance.id,
      })),
    [scheduledInstances],
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
      await dispatch(createAssignment({ shiftInstanceId, employeeMembershipId })).unwrap()
      setOpen(false)
      setShiftInstanceId("")
      setEmployeeMembershipId("")
      onCreated()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" className="h-8 rounded-none text-xs" onClick={() => setOpen(true)}>
        Assign Employee
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} heading="Assign employee to shift" className="sm:min-w-0 sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Shift instance</Label>
            {scheduledInstances.length > 0 ? (
              <Combobox
                value={shiftInstanceId}
                onChange={setShiftInstanceId}
                options={shiftOptions}
                placeholder="Select a shift"
                searchPlaceholder="Search shifts"
                className="h-9 text-sm"
              />
            ) : (
              <Input
                required
                placeholder="Shift instance ID"
                value={shiftInstanceId}
                onChange={(e) => setShiftInstanceId(e.target.value)}
                className="h-9 rounded-none text-sm font-mono"
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Employee membership ID</Label>
            {employeeOptions.length > 0 ? (
              <Combobox
                value={employeeMembershipId}
                onChange={setEmployeeMembershipId}
                options={employeeOptions}
                placeholder="Select an employee"
                searchPlaceholder="Search employees"
                className="h-9 text-sm"
              />
            ) : (
              <Input
                required
                placeholder="Employee membership ID"
                value={employeeMembershipId}
                onChange={(e) => setEmployeeMembershipId(e.target.value)}
                className="h-9 rounded-none text-sm font-mono"
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-none text-xs"
              disabled={isLoading || !shiftInstanceId}
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
  { key: "templates", label: "Templates" },
  { key: "shifts", label: "Shifts" },
  { key: "assignments", label: "Assignments" },
]

const Scheduling = () => {
  const dispatch = useAppDispatch()

  const templates = useAppSelector((s) => s.scheduling.templates)
  const instances = useAppSelector((s) => s.scheduling.instances)
  const assignments = useAppSelector((s) => s.scheduling.assignments)
  const templatesPage = useAppSelector((s) => s.scheduling.templatesPage)
  const instancesPage = useAppSelector((s) => s.scheduling.instancesPage)
  const assignmentsPage = useAppSelector((s) => s.scheduling.assignmentsPage)
  const statusTemplatesPage = useAppSelector((s) => s.scheduling.status.templatesPage)
  const statusInstancesPage = useAppSelector((s) => s.scheduling.status.instancesPage)
  const statusAssignmentsPage = useAppSelector((s) => s.scheduling.status.assignmentsPage)

  const [activeTab, setActiveTab] = React.useState<Tab>("templates")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })

  // Lookup fetch: full-ish lists used by dialogs (template/shift pickers) and
  // summary card counts, independent of the active tab's table pagination.
  React.useEffect(() => {
    dispatch(fetchTemplates())
    dispatch(fetchInstances())
    dispatch(fetchAssignments())
  }, [dispatch])

  // Table fetch: paginated data for whichever tab is currently visible.
  React.useEffect(() => {
    const params = { page: pagination.pageIndex + 1, pageSize: pagination.pageSize }
    if (activeTab === "templates") dispatch(fetchTemplatesPage(params))
    else if (activeTab === "shifts") dispatch(fetchInstancesPage(params))
    else dispatch(fetchAssignmentsPage(params))
  }, [dispatch, activeTab, pagination.pageIndex, pagination.pageSize])

  const summaryCards = [
    { label: "Templates", value: String(templates.length), sub: "shift templates" },
    { label: "Shifts", value: String(instances.length), sub: "shift instances" },
    { label: "Assignments", value: String(assignments.length), sub: "active assignments" },
  ]

  const isLoadingCurrent =
    activeTab === "templates"
      ? statusTemplatesPage === "loading" && templatesPage.data.length === 0
      : activeTab === "shifts"
      ? statusInstancesPage === "loading" && instancesPage.data.length === 0
      : statusAssignmentsPage === "loading" && assignmentsPage.data.length === 0

  const isFetchingCurrent =
    activeTab === "templates"
      ? statusTemplatesPage === "loading" && templatesPage.data.length > 0
      : activeTab === "shifts"
      ? statusInstancesPage === "loading" && instancesPage.data.length > 0
      : statusAssignmentsPage === "loading" && assignmentsPage.data.length > 0

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
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {summaryCards.map((m, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-[0.12em]">
                      {m.label}
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold tabular-nums tracking-tighter">
                      {m.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tab bar */}
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
                    "relative h-9 px-4 text-xs transition-colors",
                    activeTab === tab.key
                      ? "border-b-2 border-primary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Templates tab */}
            {activeTab === "templates" && (
              <DataTable
                eyebrow="Scheduling"
                title="Shift templates"
                columns={templateColumns}
                data={templatesPage.data}
                getRowId={(t) => t.id}
                pagination={pagination}
                paginationInfo={templatesPage}
                onPaginationChange={setPagination}
                rowCount={templatesPage.total}
                pageSizeOptions={[8, 16, 32]}
                isLoading={isLoadingCurrent}
                isFetching={isFetchingCurrent}
                emptyTitle="No templates yet"
                emptyDescription="Create a template to define recurring shift patterns."
                actions={
                  <NewTemplateDialog
                    onCreated={() => {
                      dispatch(fetchTemplates())
                      dispatch(fetchTemplatesPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
                    }}
                  />
                }
              />
            )}

            {/* Shifts tab */}
            {activeTab === "shifts" && (
              <DataTable
                eyebrow="Scheduling"
                title="Shift instances"
                columns={instanceColumns}
                data={instancesPage.data}
                getRowId={(i) => i.id}
                pagination={pagination}
                paginationInfo={instancesPage}
                onPaginationChange={setPagination}
                rowCount={instancesPage.total}
                pageSizeOptions={[8, 16, 32]}
                isLoading={isLoadingCurrent}
                isFetching={isFetchingCurrent}
                emptyTitle="No shifts scheduled"
                emptyDescription="Create a shift to schedule work for your team."
                actions={
                  <NewShiftDialog
                    onCreated={() => {
                      dispatch(fetchInstances())
                      dispatch(fetchInstancesPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
                    }}
                  />
                }
              />
            )}

            {/* Assignments tab */}
            {activeTab === "assignments" && (
              <DataTable
                eyebrow="Scheduling"
                title="Shift assignments"
                columns={assignmentColumns}
                data={assignmentsPage.data}
                getRowId={(a) => a.id}
                pagination={pagination}
                paginationInfo={assignmentsPage}
                onPaginationChange={setPagination}
                rowCount={assignmentsPage.total}
                pageSizeOptions={[8, 16, 32]}
                isLoading={isLoadingCurrent}
                isFetching={isFetchingCurrent}
                emptyTitle="No assignments yet"
                emptyDescription="Assign employees to scheduled shifts to get started."
                actions={
                  <AssignEmployeeDialog
                    onCreated={() => {
                      dispatch(fetchAssignments())
                      dispatch(fetchAssignmentsPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
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
