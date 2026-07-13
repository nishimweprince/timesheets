"use client"

import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import { LinkIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import PageHeader from "@/components/reusable/layout/PageHeader"
import { DataTable } from "@/components/reusable/tables"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { AttendancePolicy } from "@/lib/api/policies.api"
import { countActiveRequirements } from "@/pages/policies/format-rules"
import {
  fetchAssignments,
  fetchPoliciesPage,
  fetchWorkSitesPage,
} from "@/states/features/policies.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { buildPolicyColumns, buildWorkSiteColumns } from "./policies.columns"
import { scopeLabel, type Tab } from "./policies.constants"
import { AssignPolicyDialog } from "./components/AssignPolicyDialog"
import { CreatePolicyDialog } from "./components/CreatePolicyDialog"
import { CreateWorkSiteDialog } from "./components/CreateWorkSiteDialog"
import { EditPolicyDialog } from "./components/EditPolicyDialog"
import { SummaryCard } from "./components/SummaryCard"

function PoliciesPage({ tab = "policies" }: { tab?: Tab }) {
  const dispatch = useAppDispatch()
  const policiesPage = useAppSelector((state) => state.policies.policiesPage)
  const workSitesPage = useAppSelector((state) => state.policies.workSitesPage)
  const assignments = useAppSelector((state) => state.policies.assignments)
  const status = useAppSelector((state) => state.policies.status)
  const permissions = useAppSelector((state) => state.auth.user?.permissions ?? [])
  const canManage = permissions.includes("policy.manage")
  const canReadEmployees = permissions.includes("employee.read")
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
    if (tab !== "policies") return
    dispatch(
      fetchPoliciesPage({
        page: policiesPagination.pageIndex + 1,
        pageSize: policiesPagination.pageSize,
      }),
    )
  }, [dispatch, policiesPagination.pageIndex, policiesPagination.pageSize, tab])

  React.useEffect(() => {
    if (tab !== "work-sites") return
    dispatch(
      fetchWorkSitesPage({
        page: workSitesPagination.pageIndex + 1,
        pageSize: workSitesPagination.pageSize,
      }),
    )
  }, [dispatch, tab, workSitesPagination.pageIndex, workSitesPagination.pageSize])

  React.useEffect(() => {
    if (tab === "policies") dispatch(fetchAssignments())
  }, [dispatch, tab])

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
  }, [
    dispatch,
    policiesPagination.pageIndex,
    policiesPagination.pageSize,
    workSitesPagination.pageIndex,
    workSitesPagination.pageSize,
  ])

  const policyColumns = React.useMemo(
    () => buildPolicyColumns({ canManage, onEdit: setEditingPolicy }),
    [canManage],
  )
  const workSiteColumns = React.useMemo(() => buildWorkSiteColumns(), [])
  const activePolicies = policiesPage.data.filter((policy) => policy.active).length
  const requirementTotal = policiesPage.data.reduce(
    (sum, policy) => sum + countActiveRequirements(policy.rules),
    0,
  )

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
            <PageHeader
              title={
                <>
                  <span className="text-sm font-normal text-muted-foreground">
                    Attendance governance
                  </span>
                  <span className="text-[13px] font-semibold tracking-tight text-foreground">
                    Policies & work sites
                  </span>
                </>
              }
              className="border-b border-border/60 pb-4"
              titleClassName="flex flex-col gap-1"
            />

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
                {tab === "policies" ? (
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

            {tab === "policies" ? (
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

            {tab === "policies" && assignments.length > 0 ? (
              <Card className="rounded-xs border-border/70 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription className="text-sm text-muted-foreground">Assignments</CardDescription>
                  <CardTitle className="text-[13px] font-semibold tracking-tight">
                    Active policy coverage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {assignments.map((assignment) => {
                    const policy = policiesPage.data.find((item) => item.id === assignment.policyId)
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between border border-border/60 px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {policy?.name ?? assignment.policyId}
                        </span>
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

export default PoliciesPage
