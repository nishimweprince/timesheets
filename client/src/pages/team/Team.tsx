"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { DataTable } from "@/components/reusable/tables"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import type { Tab } from "./team.constants"
import { useTeam } from "./useTeam"
import { SummaryCard } from "./components/SummaryCard"
import { InviteEmployeeDialog } from "./components/InviteEmployeeDialog"
import { EmployeeDialog } from "./components/EmployeeDialog"
import { TeamDialog } from "./components/TeamDialog"

function TeamPage({ tab = "employees" }: { tab?: Tab }) {
  const t = useTeam(tab)

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
              <SummaryCard label="Employees" value={t.employees.length} description="total records" />
              <SummaryCard label="Active" value={t.activeEmployees} description="ready to schedule" />
              <SummaryCard label="Pending" value={t.pendingEmployees} description="awaiting onboarding" />
            </div>

            <div className="flex items-center justify-end gap-2 border-b border-border pb-3">
              {t.activeTab === "employees" ? (
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={t.query}
                    onChange={(event) => t.setQuery(event.target.value)}
                    placeholder="Search team"
                    className="h-11 w-64 rounded-xs pl-9 text-sm"
                  />
                </div>
              ) : null}
              {t.activeTab === "employees" ? (
                <InviteEmployeeDialog employees={t.employees} teams={t.teams} onMutated={t.refreshCurrentPages} />
              ) : (
                <TeamDialog employees={t.employees} mode="create" onMutated={t.refreshCurrentPages} />
              )}
            </div>

            {t.activeTab === "employees" ? (
              <DataTable
                eyebrow="People"
                title="Employee directory"
                description="Manage employee profiles, access status, roles, and team assignments."
                columns={t.employeeColumns}
                data={t.employeesPage.data}
                tableClassName="min-w-[980px]"
                getRowId={(employee) => employee.membershipId}
                pagination={t.employeesPagination}
                paginationInfo={t.employeesPage}
                onPaginationChange={t.setEmployeesPagination}
                rowCount={t.employeesPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={t.status.employeesPage === "loading" && t.employeesPage.data.length === 0}
                isFetching={t.status.employeesPage === "loading" && t.employeesPage.data.length > 0}
                emptyTitle="No employees yet"
                emptyDescription="Invite an employee to start building the team directory."
                emptyAction={<InviteEmployeeDialog employees={t.employees} teams={t.teams} onMutated={t.refreshCurrentPages} />}
              />
            ) : (
              <DataTable
                eyebrow="Teams"
                title="Team structure"
                description="Create operating teams and assign managers for scheduling and reporting."
                columns={t.teamColumns}
                data={t.teamsPage.data}
                tableClassName="min-w-[700px]"
                getRowId={(team) => team.id}
                pagination={t.teamsPagination}
                paginationInfo={t.teamsPage}
                onPaginationChange={t.setTeamsPagination}
                rowCount={t.teamsPage.total}
                pageSizeOptions={[10, 25, 50]}
                isLoading={t.status.teamsPage === "loading" && t.teamsPage.data.length === 0}
                isFetching={t.status.teamsPage === "loading" && t.teamsPage.data.length > 0}
                emptyTitle="No teams yet"
                emptyDescription="Create a team to group employees for operations."
                emptyAction={<TeamDialog employees={t.employees} mode="create" onMutated={t.refreshCurrentPages} />}
              />
            )}
          </div>
        </div>
      </SidebarInset>

      {t.editingEmployee ? (
        <EmployeeDialog
          employee={t.editingEmployee}
          employees={t.employees}
          teams={t.teams}
          onMutated={t.refreshCurrentPages}
          onClose={() => t.setEditingEmployee(null)}
        />
      ) : null}
      {t.editingTeam ? (
        <TeamDialog
          employees={t.employees}
          mode="edit"
          team={t.editingTeam}
          onMutated={t.refreshCurrentPages}
          onClose={() => t.setEditingTeam(null)}
        />
      ) : null}
    </SidebarProvider>
  )
}

export default TeamPage
