"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import { EditIcon, MailIcon, PlusIcon, RefreshCcwIcon, SearchIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { DataTable } from "@/components/reusable/tables"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Modal from "@/components/reusable/cards/Modal"
import Combobox from "@/components/reusable/inputs/Combobox"
import Select from "@/components/reusable/inputs/Select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { showApiErrorToast } from "@/lib/api/errors"
import { MembershipStatus, type Employee, type Team as TeamRecord } from "@/lib/api/employee-management.api"
import { cn } from "@/lib/utils"
import {
  createTeam,
  fetchEmployees,
  fetchEmployeesPage,
  fetchTeams,
  fetchTeamsPage,
  inviteEmployee,
  resendEmployeeInvitation,
  updateEmployee,
  updateTeam,
} from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

const roleOptions = ["Employee", "Manager", "Auditor", "Organization Admin"]
const roleSelectOptions = roleOptions.map((role) => ({ label: role, value: role }))
const statusOptions = [
  { label: "Pending", value: MembershipStatus.PENDING },
  { label: "Active", value: MembershipStatus.ACTIVE },
  { label: "Inactive", value: MembershipStatus.INACTIVE },
]

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

function employeeOptions(employees: Pick<Employee, "membershipId" | "firstName" | "lastName" | "email">[]) {
  return [
    { label: "No manager", value: "none" },
    ...employees.map((employee) => ({
      label: `${employeeName(employee)} · ${employee.email}`,
      value: employee.membershipId,
    })),
  ]
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
  const employeesPage = useAppSelector((state) => state.employeeManagement.employeesPage)
  const teamsPage = useAppSelector((state) => state.employeeManagement.teamsPage)
  const status = useAppSelector((state) => state.employeeManagement.status)
  const [activeTab, setActiveTab] = React.useState<Tab>("employees")
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [employeesPagination, setEmployeesPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [teamsPagination, setTeamsPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null)
  const [editingTeam, setEditingTeam] = React.useState<TeamRecord | null>(null)

  // Lookup fetch: full-ish lists used by dropdowns (managers, team checkboxes)
  // and the manager-name lookup in the teams table, independent of pagination.
  React.useEffect(() => {
    dispatch(fetchEmployees())
    dispatch(fetchTeams())
  }, [dispatch])

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setEmployeesPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  React.useEffect(() => {
    dispatch(
      fetchEmployeesPage({
        page: employeesPagination.pageIndex + 1,
        pageSize: employeesPagination.pageSize,
        search: debouncedQuery || undefined,
      }),
    )
  }, [dispatch, employeesPagination.pageIndex, employeesPagination.pageSize, debouncedQuery])

  React.useEffect(() => {
    dispatch(
      fetchTeamsPage({ page: teamsPagination.pageIndex + 1, pageSize: teamsPagination.pageSize }),
    )
  }, [dispatch, teamsPagination.pageIndex, teamsPagination.pageSize])

  const refreshCurrentPages = React.useCallback(() => {
    dispatch(
      fetchEmployeesPage({
        page: employeesPagination.pageIndex + 1,
        pageSize: employeesPagination.pageSize,
        search: debouncedQuery || undefined,
      }),
    )
    dispatch(
      fetchTeamsPage({ page: teamsPagination.pageIndex + 1, pageSize: teamsPagination.pageSize }),
    )
  }, [dispatch, employeesPagination, teamsPagination, debouncedQuery])

  const activeEmployees = employees.filter((employee) => employee.status === MembershipStatus.ACTIVE).length
  const pendingEmployees = employees.filter((employee) => employee.status === MembershipStatus.PENDING).length

  const employeeColumns = React.useMemo<ColumnDef<Employee>[]>(() => [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate font-medium leading-5">{employeeName(row.original)}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">{row.original.email}</div>
        </div>
      ),
      meta: { width: "17rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "jobTitle",
      header: "Profile",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate leading-5">{row.original.jobTitle || "-"}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">{row.original.employeeNumber || "No employee number"}</div>
        </div>
      ),
      meta: { width: "14rem", cellClassName: "py-3" },
    },
    {
      id: "teams",
      header: "Teams",
      cell: ({ row }) => <span className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{teamNames(row.original)}</span>,
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ getValue }) => <span>{getValue<string | null>() ?? "-"}</span>,
      meta: { width: "10rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col items-end gap-1">
          <span className={cn("inline-flex h-6 items-center border px-2 text-[13px] uppercase", statusClass(row.original.status))}>
            {row.original.status.toLowerCase()}
          </span>
         {row.original.invitation.status && ["expired", "pending"].includes(row.original.invitation.status) ? <span className="text-[13px] text-muted-foreground">{invitationLabel(row.original)}</span> : null}
        </div>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
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
      meta: { align: "right", width: "6.5rem", cellClassName: "py-3" },
    },
  ], [dispatch, status.resendInvite])

  const teamColumns = React.useMemo<ColumnDef<TeamRecord>[]>(() => [
    {
      accessorKey: "name",
      header: "Team",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "managerMembershipId",
      header: "Manager",
      cell: ({ getValue }) => {
        const manager = employees.find((employee) => employee.membershipId === getValue<string | null>())
        return <span className="text-[13px] text-muted-foreground">{manager ? employeeName(manager) : "-"}</span>
      },
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      meta: { align: "right", width: "8rem", cellClassName: "py-3" },
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
      meta: { align: "right", width: "4.5rem", cellClassName: "py-3" },
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
                      "relative h-9 px-4 text-[13px] capitalize transition-colors",
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
                      className="h-11 w-64 rounded-none pl-9 text-sm"
                    />
                  </div>
                ) : null}
                {activeTab === "employees" ? (
                  <InviteEmployeeDialog employees={employees} teams={teams} onMutated={refreshCurrentPages} />
                ) : (
                  <TeamDialog employees={employees} mode="create" onMutated={refreshCurrentPages} />
                )}
              </div>
            </div>

            {activeTab === "employees" ? (
              <DataTable
                eyebrow="People"
                title="Employee directory"
                description="Manage employee profiles, access status, roles, and team assignments."
                columns={employeeColumns}
                data={employeesPage.data}
                tableClassName="min-w-[980px]"
                getRowId={(employee) => employee.membershipId}
                pagination={employeesPagination}
                paginationInfo={employeesPage}
                onPaginationChange={setEmployeesPagination}
                rowCount={employeesPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.employeesPage === "loading" && employeesPage.data.length === 0}
                isFetching={status.employeesPage === "loading" && employeesPage.data.length > 0}
                emptyTitle="No employees yet"
                emptyDescription="Invite an employee to start building the team directory."
                emptyAction={<InviteEmployeeDialog employees={employees} teams={teams} onMutated={refreshCurrentPages} />}
              />
            ) : (
              <DataTable
                eyebrow="Teams"
                title="Team structure"
                description="Create operating teams and assign managers for scheduling and reporting."
                columns={teamColumns}
                data={teamsPage.data}
                tableClassName="min-w-[700px]"
                getRowId={(team) => team.id}
                pagination={teamsPagination}
                paginationInfo={teamsPage}
                onPaginationChange={setTeamsPagination}
                rowCount={teamsPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.teamsPage === "loading" && teamsPage.data.length === 0}
                isFetching={status.teamsPage === "loading" && teamsPage.data.length > 0}
                emptyTitle="No teams yet"
                emptyDescription="Create a team to group employees for operations."
                emptyAction={<TeamDialog employees={employees} mode="create" onMutated={refreshCurrentPages} />}
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
          onMutated={refreshCurrentPages}
          onClose={() => setEditingEmployee(null)}
        />
      ) : null}
      {editingTeam ? (
        <TeamDialog
          employees={employees}
          mode="edit"
          team={editingTeam}
          onMutated={refreshCurrentPages}
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
        <CardDescription className="text-[13px] tracking-[0.12em] uppercase">{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tighter tabular-nums">
          <UsersIcon className="size-4 text-muted-foreground" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function InviteEmployeeDialog({
  employees,
  teams,
  onMutated,
}: {
  employees: Employee[]
  teams: TeamRecord[]
  onMutated?: () => void
}) {
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
      onMutated?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <MailIcon data-icon="inline-start" />
        Invite
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          reset()
        }}
        heading="Invite employee"
        description="Send an onboarding link and prepare their team profile."
        className="sm:min-w-0 sm:max-w-xl"
      >
        <form onSubmit={submit}>
          <EmployeeForm form={form} setForm={setForm} employees={employees} teams={teams} mode="invite" />
          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending" : "Send invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function EmployeeDialog({
  employee,
  employees,
  teams,
  onMutated,
  onClose,
}: {
  employee: Employee
  employees: Employee[]
  teams: TeamRecord[]
  onMutated?: () => void
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
      onMutated?.()
      onClose()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      heading="Edit employee"
      description="Update profile details, team assignments, and account status."
      className="sm:min-w-0 sm:max-w-xl"
    >
        <form onSubmit={submit}>
          <EmployeeForm form={form} setForm={setForm} employees={employees} teams={teams} mode="edit" currentMembershipId={employee.membershipId} />
          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving" : "Save changes"}
            </Button>
          </div>
        </form>
    </Modal>
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
  const managerOptions = React.useMemo(() => employeeOptions(managers), [managers])

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
        <Combobox
          value={form.managerMembershipId}
          onChange={(value) => setForm((current) => ({ ...current, managerMembershipId: value }))}
          options={managerOptions}
          placeholder="Select manager"
          searchPlaceholder="Search managers"
        />
      </Field>
      <Field label="Role">
        <Select
          value={form.roleName}
          onChange={(value) => setForm((current) => ({ ...current, roleName: value }))}
          options={roleSelectOptions}
          placeholder="Select role"
        />
      </Field>
      {mode === "edit" ? (
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(value) => setForm((current) => ({ ...current, status: value as MembershipStatus }))}
            options={statusOptions}
            placeholder="Select status"
          />
        </Field>
      ) : null}
      <div className="sm:col-span-2">
        <Label className="text-[13px]">Teams</Label>
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
  onMutated,
  onClose,
}: {
  employees: Employee[]
  mode: "create" | "edit"
  team?: TeamRecord
  onMutated?: () => void
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
  const managerOptions = React.useMemo(() => employeeOptions(employees), [employees])

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
      onMutated?.()
      onClose?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      {mode === "create" ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New team
        </Button>
      ) : null}
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          reset()
          onClose?.()
        }}
        heading={mode === "create" ? "New team" : "Edit team"}
        description="Set the team name and its operating manager."
        className="sm:min-w-0 sm:max-w-md"
      >
        <form onSubmit={submit}>
          <div className="mt-5 grid gap-4">
            <Field label="Team name">
              <Input required value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Manager">
              <Combobox
                value={managerMembershipId}
                onChange={setManagerMembershipId}
                options={managerOptions}
                placeholder="Select manager"
                searchPlaceholder="Search managers"
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving" : mode === "create" ? "Create team" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  )
}

export default TeamPage
