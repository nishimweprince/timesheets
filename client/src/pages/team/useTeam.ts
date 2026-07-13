import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import { toast } from "sonner"

import { showApiErrorToast } from "@/lib/api/errors"
import { MembershipStatus, type Employee, type Team as TeamRecord } from "@/lib/api/employee-management.api"
import {
  fetchEmployees,
  fetchEmployeesPage,
  fetchTeams,
  fetchTeamsPage,
  resendEmployeeInvitation,
} from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

import type { Tab } from "./team.constants"
import { buildEmployeeColumns, buildTeamColumns } from "./team.columns"

/**
 * Container logic for the team page: data fetching, search debounce,
 * pagination, derived counts, table columns, and the edit-dialog targets.
 * Keeping this in a hook lets `Team.tsx` stay a thin presentational shell.
 */
export function useTeam(tab: Tab) {
  const dispatch = useAppDispatch()
  const employees = useAppSelector((state) => state.employeeManagement.employees)
  const teams = useAppSelector((state) => state.employeeManagement.teams)
  const employeesPage = useAppSelector((state) => state.employeeManagement.employeesPage)
  const teamsPage = useAppSelector((state) => state.employeeManagement.teamsPage)
  const status = useAppSelector((state) => state.employeeManagement.status)
  const activeTab = tab
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

  const resendInvitation = React.useCallback(
    (employee: Employee) => {
      dispatch(resendEmployeeInvitation(employee.membershipId))
        .unwrap()
        .then(() => toast.success("Invitation resent"))
        .catch((err) => showApiErrorToast(err))
    },
    [dispatch],
  )

  const employeeColumns = React.useMemo(
    () =>
      buildEmployeeColumns({
        resendDisabled: status.resendInvite === "loading",
        onResend: resendInvitation,
        onEdit: setEditingEmployee,
      }),
    [resendInvitation, status.resendInvite],
  )

  const teamColumns = React.useMemo(
    () => buildTeamColumns({ employees, onEdit: setEditingTeam }),
    [employees],
  )

  return {
    // data
    employees,
    teams,
    employeesPage,
    teamsPage,
    status,
    activeTab,
    activeEmployees,
    pendingEmployees,
    // search
    query,
    setQuery,
    // columns
    employeeColumns,
    teamColumns,
    // pagination
    employeesPagination,
    setEmployeesPagination,
    teamsPagination,
    setTeamsPagination,
    // mutations
    refreshCurrentPages,
    // edit dialogs
    editingEmployee,
    setEditingEmployee,
    editingTeam,
    setEditingTeam,
  }
}
