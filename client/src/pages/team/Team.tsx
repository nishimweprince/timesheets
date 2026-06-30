"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { EditIcon, MailIcon, PlusIcon, RefreshCcwIcon, SearchIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { DataTable } from "@/components/reusable/tables"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { showApiErrorToast } from "@/lib/api/errors"
import { MembershipStatus, type Employee, type Team as TeamRecord } from "@/lib/api/employee-management.api"
import { cn } from "@/lib/utils"
import {
  createTeam,
  fetchEmployees,
  fetchTeams,
  inviteEmployee,
  resendEmployeeInvitation,
  updateEmployee,
  updateTeam,
} from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

const roleOptions = ["Employee", "Manager", "Auditor", "Organization Admin"]

type Tab = "employees" | "teams"

type EmployeeFormState = {
  email: string
  firstName: string
  lastName: string
  employeeNumber: string
  jobTitle: string
  managerMembershipId: string
  roleName: string
  status: MembershipStatus
  teamIds: string[]
}

function employeeName(employee: Pick<Employee, "firstName" | "lastName" | "email">) {
  const name = `${employee.firstName} ${employee.lastName}`.trim()
  return name || employee.email
}

function statusClass(status: MembershipStatus) {
  if (status === MembershipStatus.ACTIVE) return "border-success/20 bg-success/10 text-success"
  if (status === MembershipStatus.PENDING) return "border-warning/25 bg-warning/10 text-warning"
  return "border-border bg-muted text-muted-foreground"
}

function invitationLabel(employee: Employee) {
  if (employee.status !== MembershipStatus.PENDING) return "-"
  if (employee.invitation.status === "expired") return "Expired"
  return "Pending"
}

function teamNames(employee: Employee) {
  return employee.teams.length > 0 ? employee.teams.map((team) => team.name).join(", ") : "-"
}

function emptyEmployeeForm(): EmployeeFormState {
  return {
    email: "",
    firstName: "",
    lastName: "",
    employeeNumber: "",
    jobTitle: "",
    managerMembershipId: "none",
    roleName: "Employee",
    status: MembershipStatus.PENDING,
    teamIds: [],
  }
}

function employeeToForm(employee: Employee): EmployeeFormState {
  return {
    email: employee.email,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeNumber: employee.employeeNumber ?? "",
    jobTitle: employee.jobTitle ?? "",
    managerMembershipId: employee.managerMembershipId ?? "none",
    roleName: employee.roleName ?? "Employee",
    status: employee.status,
    teamIds: employee.teams.map((team) => team.id),
  }
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

function TeamPage() {
  const dispatch = useAppDispatch()
  const employees = useAppSelector((state) => state.employeeManagement.employees)
  const teams = useAppSelector((state) => state.employeeManagement.teams)
  const status = useAppSelector((state) => state.employeeManagement.status)
  const [activeTab, setActiveTab] = React.useState<Tab>("employees")
  const [query, setQuery] = React.useState("")
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null)
  const [editingTeam, setEditingTeam] = React.useState<TeamRecord | null>(null)

  React.useEffect(() => {
    dispatch(fetchEmployees())
    dispatch(fetchTeams())
  }, [dispatch])

  const activeEmployees = employees.filter((employee) => employee.status === MembershipStatus.ACTIVE).length
  const pendingEmployees = employees.filter((employee) => employee.status === MembershipStatus.PENDING).length

  const filteredEmployees = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return employees
    return employees.filter((employee) =>
      [
        employeeName(employee),
        employee.email,
        employee.employeeNumber ?? "",
        employee.jobTitle ?? "",
        employee.roleName ?? "",
        teamNames(employee),
      ].some((value) => value.toLowerCase().includes(needle)),
    )
  }, [employees, query])

  const employeeColumns = React.useMemo<ColumnDef<Employee>[]>(() => [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{employeeName(row.original)}</div>
          <div className="truncate text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
      meta: { width: "16rem" },
    },
    {
      accessorKey: "jobTitle",
      header: "Profile",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate">{row.original.jobTitle || "-"}</div>
          <div className="truncate text-xs text-muted-foreground">{row.original.employeeNumber || "No employee number"}</div>
        </div>
      ),
    },
    {
      id: "teams",
      header: "Teams",
      cell: ({ row }) => <span className="line-clamp-2 text-muted-foreground">{teamNames(row.original)}</span>,
    },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ getValue }) => <span>{getValue<string | null>() ?? "-"}</span>,
      meta: { width: "9rem" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col items-end gap-1">
          <span className={cn("inline-flex h-6 items-center border px-2 text-xs uppercase", statusClass(row.original.status))}>
            {row.original.status.toLowerCase()}
          </span>
          <span className="text-[11px] text-muted-foreground">{invitationLabel(row.original)}</span>
        </div>
      ),
      meta: { align: "right", width: "8rem" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {row.original.status === MembershipStatus.PENDING ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Resend invitation"
              disabled={status.resendInvite === "loading"}
              onClick={(event) => {
                event.stopPropagation()
                dispatch(resendEmployeeInvitation(row.original.membershipId))
                  .unwrap()
                  .then(() => toast.success("Invitation resent"))
                  .catch((err) => showApiErrorToast(err))
              }}
            >
              <RefreshCcwIcon />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit employee"
            onClick={(event) => {
              event.stopPropagation()
              setEditingEmployee(row.original)
            }}
          >
            <EditIcon />
          </Button>
        </div>
      ),
      meta: { align: "right", width: "6rem" },
    },
  ], [dispatch, status.resendInvite])

  const teamColumns = React.useMemo<ColumnDef<TeamRecord>[]>(() => [
    {
      accessorKey: "name",
      header: "Team",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "managerMembershipId",
      header: "Manager",
      cell: ({ getValue }) => {
        const manager = employees.find((employee) => employee.membershipId === getValue<string | null>())
        return <span className="text-muted-foreground">{manager ? employeeName(manager) : "-"}</span>
      },
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      meta: { align: "right", width: "8rem" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit team"
            onClick={(event) => {
              event.stopPropagation()
              setEditingTeam(row.original)
            }}
          >
            <EditIcon />
          </Button>
        </div>
      ),
      meta: { align: "right", width: "4rem" },
    },
  ], [employees])

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
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Employees" value={employees.length} description="total records" />
              <SummaryCard label="Active" value={activeEmployees} description="ready to schedule" />
              <SummaryCard label="Pending" value={pendingEmployees} description="awaiting onboarding" />
            </div>

            <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-1">
                {(["employees", "teams"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative h-9 px-4 text-xs capitalize transition-colors",
                      activeTab === tab
                        ? "border-b-2 border-primary font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pb-3 sm:pb-2">
                {activeTab === "employees" ? (
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search team"
                      className="h-8 w-56 rounded-none pl-8 text-xs"
                    />
                  </div>
                ) : null}
                {activeTab === "employees" ? (
                  <InviteEmployeeDialog employees={employees} teams={teams} />
                ) : (
                  <TeamDialog employees={employees} mode="create" />
                )}
              </div>
            </div>

            {activeTab === "employees" ? (
              <DataTable
                eyebrow="People"
                title="Employee directory"
                description="Manage employee profiles, access status, roles, and team assignments."
                columns={employeeColumns}
                data={filteredEmployees}
                getRowId={(employee) => employee.membershipId}
                isLoading={status.employees === "loading"}
                emptyTitle="No employees yet"
                emptyDescription="Invite an employee to start building the team directory."
                emptyAction={<InviteEmployeeDialog employees={employees} teams={teams} />}
                hidePagination
              />
            ) : (
              <DataTable
                eyebrow="Teams"
                title="Team structure"
                description="Create operating teams and assign managers for scheduling and reporting."
                columns={teamColumns}
                data={teams}
                getRowId={(team) => team.id}
                isLoading={status.teams === "loading"}
                emptyTitle="No teams yet"
                emptyDescription="Create a team to group employees for operations."
                emptyAction={<TeamDialog employees={employees} mode="create" />}
                hidePagination
              />
            )}
          </div>
        </div>
      </SidebarInset>

      {editingEmployee ? (
        <EmployeeDialog
          employee={editingEmployee}
          employees={employees}
          teams={teams}
          onClose={() => setEditingEmployee(null)}
        />
      ) : null}
      {editingTeam ? (
        <TeamDialog
          employees={employees}
          mode="edit"
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
        />
      ) : null}
    </SidebarProvider>
  )
}

function SummaryCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs tracking-[0.12em] uppercase">{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tighter tabular-nums">
          <UsersIcon className="size-4 text-muted-foreground" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function InviteEmployeeDialog({ employees, teams }: { employees: Employee[]; teams: TeamRecord[] }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.employeeManagement.status.invite === "loading")
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<EmployeeFormState>(emptyEmployeeForm)

  const reset = () => setForm(emptyEmployeeForm())

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await dispatch(inviteEmployee({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        employeeNumber: form.employeeNumber || undefined,
        jobTitle: form.jobTitle || undefined,
        managerMembershipId: form.managerMembershipId === "none" ? undefined : form.managerMembershipId,
        roleName: form.roleName,
        teamIds: form.teamIds,
      })).unwrap()
      toast.success("Employee invited", { description: "The onboarding email has been sent." })
      reset()
      setOpen(false)
      dispatch(fetchTeams())
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) reset()
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MailIcon data-icon="inline-start" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Invite employee</DialogTitle>
            <DialogDescription>Send an onboarding link and prepare their team profile.</DialogDescription>
          </DialogHeader>
          <EmployeeForm form={form} setForm={setForm} employees={employees} teams={teams} mode="invite" />
          <DialogFooter className="mt-5">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EmployeeDialog({
  employee,
  employees,
  teams,
  onClose,
}: {
  employee: Employee
  employees: Employee[]
  teams: TeamRecord[]
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.employeeManagement.status.updateEmployee === "loading")
  const [form, setForm] = React.useState<EmployeeFormState>(() => employeeToForm(employee))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await dispatch(updateEmployee({
        membershipId: employee.membershipId,
        payload: {
          firstName: form.firstName,
          lastName: form.lastName,
          employeeNumber: form.employeeNumber || null,
          jobTitle: form.jobTitle || null,
          managerMembershipId: form.managerMembershipId === "none" ? null : form.managerMembershipId,
          roleName: form.roleName,
          status: form.status,
          teamIds: form.teamIds,
        },
      })).unwrap()
      toast.success("Employee updated")
      dispatch(fetchTeams())
      onClose()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Edit employee</DialogTitle>
            <DialogDescription>Update profile details, team assignments, and account status.</DialogDescription>
          </DialogHeader>
          <EmployeeForm form={form} setForm={setForm} employees={employees} teams={teams} mode="edit" currentMembershipId={employee.membershipId} />
          <DialogFooter className="mt-5">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EmployeeForm({
  form,
  setForm,
  employees,
  teams,
  mode,
  currentMembershipId,
}: {
  form: EmployeeFormState
  setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>
  employees: Employee[]
  teams: TeamRecord[]
  mode: "invite" | "edit"
  currentMembershipId?: string
}) {
  const managers = employees.filter((employee) => employee.membershipId !== currentMembershipId)

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="First name">
        <Input required value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} />
      </Field>
      <Field label="Last name">
        <Input required value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} />
      </Field>
      <Field label="Email">
        <Input
          required
          type="email"
          disabled={mode === "edit"}
          value={form.email}
          onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
        />
      </Field>
      <Field label="Employee number">
        <Input value={form.employeeNumber} onChange={(event) => setForm((value) => ({ ...value, employeeNumber: event.target.value }))} />
      </Field>
      <Field label="Job title">
        <Input value={form.jobTitle} onChange={(event) => setForm((value) => ({ ...value, jobTitle: event.target.value }))} />
      </Field>
      <Field label="Manager">
        <Select value={form.managerMembershipId} onValueChange={(value) => setForm((current) => ({ ...current, managerMembershipId: value }))}>
          <SelectTrigger className="h-9 rounded-none text-sm">
            <SelectValue placeholder="Select manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No manager</SelectItem>
            {managers.map((employee) => (
              <SelectItem key={employee.membershipId} value={employee.membershipId}>
                {employeeName(employee)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Role">
        <Select value={form.roleName} onValueChange={(value) => setForm((current) => ({ ...current, roleName: value }))}>
          <SelectTrigger className="h-9 rounded-none text-sm">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {mode === "edit" ? (
        <Field label="Status">
          <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as MembershipStatus }))}>
            <SelectTrigger className="h-9 rounded-none text-sm">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MembershipStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={MembershipStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={MembershipStatus.INACTIVE}>Inactive</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <div className="sm:col-span-2">
        <Label className="text-xs">Teams</Label>
        <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto border border-border p-3 sm:grid-cols-2">
          {teams.length ? teams.map((team) => (
            <label key={team.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.teamIds.includes(team.id)}
                onCheckedChange={() => setForm((value) => ({ ...value, teamIds: toggleId(value.teamIds, team.id) }))}
              />
              <span className="truncate">{team.name}</span>
            </label>
          )) : (
            <p className="text-sm text-muted-foreground">Create teams after inviting employees.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamDialog({
  employees,
  mode,
  team,
  onClose,
}: {
  employees: Employee[]
  mode: "create" | "edit"
  team?: TeamRecord
  onClose?: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) =>
    mode === "create"
      ? state.employeeManagement.status.createTeam === "loading"
      : state.employeeManagement.status.updateTeam === "loading",
  )
  const [open, setOpen] = React.useState(mode === "edit")
  const [name, setName] = React.useState(team?.name ?? "")
  const [managerMembershipId, setManagerMembershipId] = React.useState(team?.managerMembershipId ?? "none")

  const reset = () => {
    setName(team?.name ?? "")
    setManagerMembershipId(team?.managerMembershipId ?? "none")
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const payload = {
        name,
        managerMembershipId: managerMembershipId === "none" ? null : managerMembershipId,
      }
      if (mode === "create") {
        await dispatch(createTeam(payload)).unwrap()
        toast.success("Team created")
      } else if (team) {
        await dispatch(updateTeam({ teamId: team.id, payload })).unwrap()
        toast.success("Team updated")
      }
      reset()
      setOpen(false)
      onClose?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        reset()
        onClose?.()
      }
    }}>
      {mode === "create" ? (
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            New team
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">{mode === "create" ? "New team" : "Edit team"}</DialogTitle>
            <DialogDescription>Set the team name and its operating manager.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4">
            <Field label="Team name">
              <Input required value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Manager">
              <Select value={managerMembershipId} onValueChange={setManagerMembershipId}>
                <SelectTrigger className="h-9 rounded-none text-sm">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.membershipId} value={employee.membershipId}>
                      {employeeName(employee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter className="mt-5">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving" : mode === "create" ? "Create team" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

export default TeamPage
