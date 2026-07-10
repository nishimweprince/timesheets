"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  Building2Icon,
  EditIcon,
  LinkIcon,
  MapPinIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import Modal from "@/components/reusable/cards/Modal"
import Combobox from "@/components/reusable/inputs/Combobox"
import Input from "@/components/reusable/inputs/Input"
import Select from "@/components/reusable/inputs/Select"
import { DataTable } from "@/components/reusable/tables"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { showApiErrorToast } from "@/lib/api/errors"
import {
  DEFAULT_POLICY_RULES,
  PolicyAssignmentScope,
  PolicyEnforcement,
  type AttendancePolicy,
  type AttendancePolicyRules,
  type WorkSite,
} from "@/lib/api/policies.api"
import type { Employee } from "@/lib/api/employee-management.api"
import { cn } from "@/lib/utils"
import { countActiveRequirements, formatEnforcement, summarizePolicyRules } from "@/pages/policies/format-rules"
import {
  validateAssignPolicyPayload,
  validateCreatePolicyPayload,
  validateCreateWorkSitePayload,
  validateUpdatePolicyPayload,
} from "@/pages/policies/policies-validation"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import {
  assignPolicy,
  createPolicy,
  createWorkSite,
  updatePolicy,
  fetchAssignments,
  fetchPolicies,
  fetchPoliciesPage,
  fetchWorkSitesPage,
} from "@/states/features/policies.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

type Tab = "policies" | "work-sites"

const enforcementOptions = Object.values(PolicyEnforcement).map((value) => ({
  label: formatEnforcement(value),
  value,
}))

const timezoneOptions = [
  { label: "America/Chicago (Central)", value: "America/Chicago" },
  { label: "America/New_York (Eastern)", value: "America/New_York" },
  { label: "America/Denver (Mountain)", value: "America/Denver" },
  { label: "America/Los_Angeles (Pacific)", value: "America/Los_Angeles" },
  { label: "UTC", value: "UTC" },
]

function employeeName(employee: Pick<Employee, "firstName" | "lastName" | "email">) {
  const name = `${employee.firstName} ${employee.lastName}`.trim()
  return name || employee.email
}

function scopeLabel(scope: string) {
  if (scope === PolicyAssignmentScope.ORGANIZATION) return "Organization"
  if (scope === PolicyAssignmentScope.EMPLOYEE) return "Employee"
  return scope.toLowerCase().replaceAll("_", " ")
}

function PoliciesPage({ tab = "policies" }: { tab?: Tab }) {
  const dispatch = useAppDispatch()
  const policiesPage = useAppSelector((state) => state.policies.policiesPage)
  const workSitesPage = useAppSelector((state) => state.policies.workSitesPage)
  const assignments = useAppSelector((state) => state.policies.assignments)
  const status = useAppSelector((state) => state.policies.status)
  const permissions = useAppSelector((state) => state.auth.user?.permissions ?? [])
  const canManage = permissions.includes("policy.manage")
  const canReadEmployees = permissions.includes("employee.read")

  const activeTab = tab
  const [policiesPagination, setPoliciesPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [workSitesPagination, setWorkSitesPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [editingPolicy, setEditingPolicy] = React.useState<AttendancePolicy | null>(null)

  React.useEffect(() => {
    if (activeTab !== "policies") return
    dispatch(
      fetchPoliciesPage({
        page: policiesPagination.pageIndex + 1,
        pageSize: policiesPagination.pageSize,
      }),
    )
  }, [dispatch, activeTab, policiesPagination.pageIndex, policiesPagination.pageSize])

  React.useEffect(() => {
    if (activeTab !== "work-sites") return
    dispatch(
      fetchWorkSitesPage({
        page: workSitesPagination.pageIndex + 1,
        pageSize: workSitesPagination.pageSize,
      }),
    )
  }, [dispatch, activeTab, workSitesPagination.pageIndex, workSitesPagination.pageSize])

  React.useEffect(() => {
    if (activeTab !== "policies") return
    dispatch(fetchAssignments())
  }, [dispatch, activeTab])

  const refresh = React.useCallback(() => {
    dispatch(
      fetchPoliciesPage({
        page: policiesPagination.pageIndex + 1,
        pageSize: policiesPagination.pageSize,
      }),
    )
    dispatch(
      fetchWorkSitesPage({
        page: workSitesPagination.pageIndex + 1,
        pageSize: workSitesPagination.pageSize,
      }),
    )
    dispatch(fetchAssignments())
  }, [dispatch, policiesPagination, workSitesPagination])

  const activePolicies = policiesPage.data.filter((policy) => policy.active).length
  const requirementTotal = policiesPage.data.reduce(
    (sum, policy) => sum + countActiveRequirements(policy.rules),
    0,
  )

  const policyColumns = React.useMemo<ColumnDef<AttendancePolicy>[]>(() => [
    {
      accessorKey: "name",
      header: "Policy",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium leading-5">{row.original.name}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">
            {countActiveRequirements(row.original.rules)} active requirements
          </div>
        </div>
      ),
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      id: "rules",
      header: "Rules",
      cell: ({ row }) => (
        <ul className="space-y-1 text-[13px] leading-5 text-muted-foreground">
          {summarizePolicyRules(row.original.rules).slice(0, 3).map((line) => (
            <li key={line} className="line-clamp-2">{line}</li>
          ))}
        </ul>
      ),
      meta: { width: "28rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex h-6 items-center border px-2 text-[13px]",
            row.original.active
              ? "border-success/20 bg-success/10 text-success"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {row.original.active ? "Active" : "Inactive"}
        </span>
      ),
      meta: { align: "right", width: "8rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString()}
        </span>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: AttendancePolicy } }) => (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit policy"
                  onClick={(event) => {
                    event.stopPropagation()
                    setEditingPolicy(row.original)
                  }}
                >
                  <EditIcon />
                </Button>
              </div>
            ),
            meta: { align: "right" as const, width: "4.5rem", cellClassName: "py-3" },
          },
        ]
      : []),
  ], [canManage])

  const workSiteColumns = React.useMemo<ColumnDef<WorkSite>[]>(() => [
    {
      accessorKey: "name",
      header: "Site",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium leading-5">{row.original.name}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">Work location</div>
        </div>
      ),
      meta: { width: "18rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "timezone",
      header: "Timezone",
      cell: ({ getValue }) => (
        <span className="font-mono text-[13px] leading-5 text-muted-foreground">{getValue<string>()}</span>
      ),
      meta: { width: "18rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ getValue }) => (
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString()}
        </span>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
    },
  ], [])

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
            <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
              <p className="text-sm text-muted-foreground">Attendance governance</p>
              <h1 className="text-[13px] font-semibold tracking-tight text-foreground">
                Policies & work sites
              </h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Policies"
                value={policiesPage.total}
                description={`${activePolicies} active on this page`}
                icon={ShieldCheckIcon}
              />
              <SummaryCard
                label="Assignments"
                value={assignments.length}
                description={`${requirementTotal} capture rules on this page`}
                icon={LinkIcon}
              />
              <SummaryCard
                label="Work sites"
                value={workSitesPage.total}
                description="locations for geofence rules"
                icon={MapPinIcon}
              />
            </div>

            {canManage ? (
              <div className="flex items-center justify-end gap-2 border-b border-border pb-3">
                {activeTab === "policies" ? (
                  <>
                    <AssignPolicyDialog
                      policies={policiesPage.data}
                      policiesTotal={policiesPage.total}
                      canReadEmployees={canReadEmployees}
                      onMutated={refresh}
                    />
                    <CreatePolicyDialog onMutated={refresh} />
                  </>
                ) : (
                  <CreateWorkSiteDialog onMutated={refresh} />
                )}
              </div>
            ) : null}

            {activeTab === "policies" ? (
              <DataTable
                eyebrow="Rules"
                title="Attendance policies"
                description="Define how clock-in and clock-out are validated across your organization."
                columns={policyColumns}
                data={policiesPage.data}
                tableClassName="min-w-[860px]"
                getRowId={(policy) => policy.id}
                pagination={policiesPagination}
                paginationInfo={policiesPage}
                onPaginationChange={setPoliciesPagination}
                rowCount={policiesPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.policiesPage === "loading" && policiesPage.data.length === 0}
                isFetching={status.policiesPage === "loading" && policiesPage.data.length > 0}
                onRowClick={canManage ? (row) => setEditingPolicy(row.original) : undefined}
                emptyTitle="No policies yet"
                emptyDescription="Create a policy to set photo, location, and exception handling rules."
                emptyAction={canManage ? <CreatePolicyDialog onMutated={refresh} /> : undefined}
              />
            ) : (
              <DataTable
                eyebrow="Locations"
                title="Work sites"
                description="Register physical locations that policies can reference for geofence checks."
                columns={workSiteColumns}
                data={workSitesPage.data}
                tableClassName="min-w-[720px]"
                getRowId={(site) => site.id}
                pagination={workSitesPagination}
                paginationInfo={workSitesPage}
                onPaginationChange={setWorkSitesPagination}
                rowCount={workSitesPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={status.workSitesPage === "loading" && workSitesPage.data.length === 0}
                isFetching={status.workSitesPage === "loading" && workSitesPage.data.length > 0}
                emptyTitle="No work sites yet"
                emptyDescription="Add a work site to anchor location-based attendance rules."
                emptyAction={canManage ? <CreateWorkSiteDialog onMutated={refresh} /> : undefined}
              />
            )}

            {activeTab === "policies" && assignments.length > 0 ? (
              <Card className="rounded-xs border-border/70 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription className="text-sm text-muted-foreground">Assignments</CardDescription>
                  <CardTitle className="text-[13px] font-semibold tracking-tight">Active policy coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {assignments.map((assignment) => {
                    const policy = policiesPage.data.find((item) => item.id === assignment.policyId)
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between border border-border/60 px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-foreground">{policy?.name ?? assignment.policyId}</span>
                        <span className="text-muted-foreground">{scopeLabel(assignment.scope)}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </SidebarInset>

      {editingPolicy ? (
        <EditPolicyDialog
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onMutated={refresh}
        />
      ) : null}
    </SidebarProvider>
  )
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="rounded-xs border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-sm text-muted-foreground">{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tighter tabular-nums">
          <Icon className="size-4 text-muted-foreground" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function EditPolicyDialog({
  policy,
  onClose,
  onMutated,
}: {
  policy: AttendancePolicy
  onClose: () => void
  onMutated?: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.policies.status.updatePolicy === "loading")
  const [name, setName] = React.useState(policy.name)
  const [active, setActive] = React.useState(policy.active)
  const [rules, setRules] = React.useState<AttendancePolicyRules>(policy.rules)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = { name: name.trim(), rules, active }
    const validationError = validateUpdatePolicyPayload(payload)
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    try {
      await dispatch(updatePolicy({ policyId: policy.id, payload })).unwrap()
      toast.success("Policy updated")
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
      heading="Edit attendance policy"
      description="Update the rules that govern clock-in validation and exception handling."
      className="sm:min-w-0 sm:max-w-2xl"
      headingClassName="normal-case tracking-tight text-[13px] font-semibold"
      descriptionClassName="text-sm text-muted-foreground"
    >
      <form onSubmit={submit} className="mt-4 space-y-5">
        <Input
          label="Policy name"
          required
          value={name}
          error={error ?? undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError(null)
          }}
          placeholder="e.g. Clinical floor — strict"
        />
        <Input
          type="checkbox"
          label="Active"
          checked={active}
          onCheckedChange={setActive}
        />
        <PolicyRulesForm rules={rules} onChange={setRules} />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CreatePolicyDialog({ onMutated }: { onMutated?: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.policies.status.createPolicy === "loading")
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [rules, setRules] = React.useState<AttendancePolicyRules>(DEFAULT_POLICY_RULES)
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setName("")
    setRules(DEFAULT_POLICY_RULES)
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validateCreatePolicyPayload({ name, rules })
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    try {
      await dispatch(createPolicy({ name: name.trim(), rules })).unwrap()
      toast.success("Policy created")
      reset()
      setOpen(false)
      onMutated?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" className="min-w-32" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        New policy
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          reset()
        }}
        heading="New attendance policy"
        description="Set the rules that govern clock-in validation and exception handling."
        className="sm:min-w-0 sm:max-w-2xl"
        headingClassName="normal-case tracking-tight text-[13px] font-semibold"
        descriptionClassName="text-sm text-muted-foreground"
      >
        <form onSubmit={submit} className="mt-4 space-y-5">
          <Input
            label="Policy name"
            required
            value={name}
            error={error ?? undefined}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. Clinical floor — strict"
          />
          <PolicyRulesForm rules={rules} onChange={setRules} />
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating" : "Create policy"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function AssignPolicyDialog({
  policies,
  policiesTotal,
  canReadEmployees,
  onMutated,
}: {
  policies: AttendancePolicy[]
  policiesTotal: number
  canReadEmployees: boolean
  onMutated?: () => void
}) {
  const dispatch = useAppDispatch()
  const lookupPolicies = useAppSelector((state) => state.policies.policies)
  const lookupStatus = useAppSelector((state) => state.policies.status.policies)
  const employees = useAppSelector((state) => state.employeeManagement.employees)
  const employeeStatus = useAppSelector((state) => state.employeeManagement.status.employees)
  const isLoading = useAppSelector((state) => state.policies.status.assignPolicy === "loading")
  const [open, setOpen] = React.useState(false)
  const [policyId, setPolicyId] = React.useState("")
  const [scope, setScope] = React.useState<string>(PolicyAssignmentScope.ORGANIZATION)
  const [scopeId, setScopeId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const scopeOptions = React.useMemo(
    () =>
      canReadEmployees
        ? [
            { label: "Organization-wide", value: PolicyAssignmentScope.ORGANIZATION },
            { label: "Single employee", value: PolicyAssignmentScope.EMPLOYEE },
          ]
        : [{ label: "Organization-wide", value: PolicyAssignmentScope.ORGANIZATION }],
    [canReadEmployees],
  )

  React.useEffect(() => {
    if (!open) return
    if (lookupPolicies.length === 0 && lookupStatus !== "loading") {
      dispatch(fetchPolicies())
    }
    if (!canReadEmployees) return
    if (employees.length === 0 && employeeStatus !== "loading") {
      dispatch(fetchEmployees())
    }
  }, [open, canReadEmployees, lookupPolicies.length, lookupStatus, employees.length, employeeStatus, dispatch])

  const assignablePolicies = lookupPolicies.length > 0 ? lookupPolicies : policies
  const policyOptions = assignablePolicies.map((policy) => ({ label: policy.name, value: policy.id }))
  const employeeOptions = employees.map((employee) => ({
    label: `${employeeName(employee)} · ${employee.email}`,
    value: employee.membershipId,
  }))

  const reset = () => {
    setPolicyId("")
    setScope(PolicyAssignmentScope.ORGANIZATION)
    setScopeId("")
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = {
      policyId,
      scope: scope as typeof PolicyAssignmentScope[keyof typeof PolicyAssignmentScope],
      scopeId: scope === PolicyAssignmentScope.EMPLOYEE ? scopeId : undefined,
    }
    const validationError = validateAssignPolicyPayload(payload, { canAssignEmployees: canReadEmployees })
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    try {
      await dispatch(assignPolicy(payload)).unwrap()
      toast.success("Policy assigned")
      reset()
      setOpen(false)
      onMutated?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="min-w-32" onClick={() => setOpen(true)} disabled={policiesTotal === 0}>
        <Building2Icon data-icon="inline-start" />
        Assign
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          reset()
        }}
        heading="Assign policy"
        description={
          canReadEmployees
            ? "Apply a policy organization-wide or to a single employee."
            : "Apply a policy organization-wide."
        }
        className="sm:min-w-0 sm:max-w-lg"
        headingClassName="normal-case tracking-tight text-[13px] font-semibold"
        descriptionClassName="text-sm text-muted-foreground"
      >
        <form onSubmit={submit} className="mt-4 grid gap-4">
          <Select
            label="Policy"
            required
            value={policyId}
            onChange={(value) => {
              setPolicyId(value)
              if (error) setError(null)
            }}
            options={policyOptions}
            placeholder="Select policy"
            error={error && !policyId ? error : undefined}
          />
          <Select
            label="Scope"
            required
            value={scope}
            onChange={(value) => {
              setScope(value)
              setScopeId("")
              if (error) setError(null)
            }}
            options={scopeOptions}
            placeholder="Select scope"
          />
          {scope === PolicyAssignmentScope.EMPLOYEE && canReadEmployees ? (
            <Combobox
              value={scopeId}
              onChange={(value) => {
                setScopeId(value)
                if (error) setError(null)
              }}
              options={employeeOptions}
              placeholder={employeeStatus === "loading" ? "Loading employees…" : "Select employee"}
              searchPlaceholder="Search employees"
            />
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                isLoading ||
                !policyId ||
                (scope === PolicyAssignmentScope.EMPLOYEE && canReadEmployees && !scopeId)
              }
            >
              {isLoading ? "Assigning" : "Assign policy"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function CreateWorkSiteDialog({ onMutated }: { onMutated?: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.policies.status.createWorkSite === "loading")
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [timezone, setTimezone] = React.useState("America/Chicago")
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setName("")
    setTimezone("America/Chicago")
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validateCreateWorkSitePayload({ name, timezone })
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    try {
      await dispatch(createWorkSite({ name: name.trim(), timezone })).unwrap()
      toast.success("Work site created")
      reset()
      setOpen(false)
      onMutated?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return (
    <>
      <Button size="sm" className="min-w-32" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        New site
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          reset()
        }}
        heading="New work site"
        description="Register a location your team clocks in from."
        className="sm:min-w-0 sm:max-w-md"
        headingClassName="normal-case tracking-tight text-[13px] font-semibold"
        descriptionClassName="text-sm text-muted-foreground"
      >
        <form onSubmit={submit} className="mt-4 grid gap-4">
          <Input
            label="Site name"
            required
            value={name}
            error={error ?? undefined}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. Main clinic"
          />
          <Select
            label="Timezone"
            value={timezone}
            onChange={setTimezone}
            options={timezoneOptions}
            placeholder="Select timezone"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating" : "Create site"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function PolicyRulesForm({
  rules,
  onChange,
}: {
  rules: AttendancePolicyRules
  onChange: (rules: AttendancePolicyRules) => void
}) {
  const update = <K extends keyof AttendancePolicyRules>(key: K, value: AttendancePolicyRules[K]) => {
    onChange({ ...rules, [key]: value })
  }

  return (
    <div className="grid gap-4 border border-border/70 p-4 sm:grid-cols-2">
      <p className="sm:col-span-2 text-sm font-medium text-foreground">Capture requirements</p>

      <Input
        type="checkbox"
        label="Require clock-in photo"
        checked={rules.requireClockInPhoto}
        onCheckedChange={(checked) => update("requireClockInPhoto", checked)}
      />
      <Input
        type="checkbox"
        label="Require clock-out photo"
        checked={rules.requireClockOutPhoto}
        onCheckedChange={(checked) => update("requireClockOutPhoto", checked)}
      />
      <Input
        type="checkbox"
        label="Require location"
        checked={rules.requireLocation}
        onCheckedChange={(checked) => update("requireLocation", checked)}
      />

      <p className="sm:col-span-2 mt-2 text-sm font-medium text-foreground">Exception handling</p>

      <Select
        label="Unplanned clock-in"
        value={rules.unplannedClockIn}
        onChange={(value) => update("unplannedClockIn", value as PolicyEnforcement)}
        options={enforcementOptions}
      />
      <Select
        label="Outside geofence"
        value={rules.outsideGeofence}
        onChange={(value) => update("outsideGeofence", value as PolicyEnforcement)}
        options={enforcementOptions}
      />

      <p className="sm:col-span-2 mt-2 text-sm font-medium text-foreground">Timing</p>

      <Input
        label="Early clock-in grace (minutes)"
        type="number"
        min={0}
        value={String(rules.earlyClockInGraceMinutes)}
        onChange={(event) => update("earlyClockInGraceMinutes", Number(event.target.value))}
      />
      <Input
        label="Late clock-in grace (minutes)"
        type="number"
        min={0}
        value={String(rules.lateClockInGraceMinutes)}
        onChange={(event) => update("lateClockInGraceMinutes", Number(event.target.value))}
      />
      <Input
        label="Max shift length (minutes)"
        type="number"
        min={1}
        value={String(rules.maxShiftMinutes)}
        onChange={(event) => update("maxShiftMinutes", Number(event.target.value))}
        containerClassName="sm:col-span-2"
      />
    </div>
  )
}

export default PoliciesPage
