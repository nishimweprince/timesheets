import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  employeeManagementApi,
  type CreateTeamPayload,
  type Employee,
  type EmployeesQueryParams,
  type InviteEmployeePayload,
  type Team,
  type UpdateEmployeePayload,
  type UpdateTeamPayload,
} from '@/lib/api/employee-management.api'
import type { PaginatedResult, PaginationParams } from '@/lib/api/pagination'

type LoadStatus = 'idle' | 'loading' | 'error'

const emptyPage = <T,>(): PaginatedResult<T> => ({ data: [], total: 0, page: 1, pageSize: 10 })

// Lookup pageSize used for full-list consumers (dropdowns, manager-name
// resolution) that need broader coverage than the interactive table page.
const LOOKUP_PAGE_SIZE = 100

interface EmployeeManagementState {
  employees: Employee[]
  teams: Team[]
  employeesPage: PaginatedResult<Employee>
  teamsPage: PaginatedResult<Team>
  latestRequests: {
    employeesPage?: string
    teamsPage?: string
  }
  status: {
    employees: LoadStatus
    teams: LoadStatus
    employeesPage: LoadStatus
    teamsPage: LoadStatus
    invite: LoadStatus
    updateEmployee: LoadStatus
    resendInvite: LoadStatus
    createTeam: LoadStatus
    updateTeam: LoadStatus
  }
}

const initialState: EmployeeManagementState = {
  employees: [],
  teams: [],
  employeesPage: emptyPage(),
  teamsPage: emptyPage(),
  latestRequests: {},
  status: {
    employees: 'idle',
    teams: 'idle',
    employeesPage: 'idle',
    teamsPage: 'idle',
    invite: 'idle',
    updateEmployee: 'idle',
    resendInvite: 'idle',
    createTeam: 'idle',
    updateTeam: 'idle',
  },
}

function upsertById<T extends { id?: string; membershipId?: string }>(
  items: T[],
  item: T,
  key: 'id' | 'membershipId',
) {
  const id = item[key]
  const index = items.findIndex((existing) => existing[key] === id)
  if (index >= 0) items[index] = item
  else items.unshift(item)
}

export const fetchEmployees = createAsyncThunk('employeeManagement/fetchEmployees', async () => {
  const result = await employeeManagementApi.employees({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchTeams = createAsyncThunk('employeeManagement/fetchTeams', async () => {
  const result = await employeeManagementApi.teams({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchEmployeesPage = createAsyncThunk(
  'employeeManagement/fetchEmployeesPage',
  (params?: EmployeesQueryParams) => employeeManagementApi.employees(params),
)

export const fetchTeamsPage = createAsyncThunk(
  'employeeManagement/fetchTeamsPage',
  (params?: PaginationParams) => employeeManagementApi.teams(params),
)

export const inviteEmployee = createAsyncThunk(
  'employeeManagement/inviteEmployee',
  (payload: InviteEmployeePayload) => employeeManagementApi.inviteEmployee(payload),
)

export const updateEmployee = createAsyncThunk(
  'employeeManagement/updateEmployee',
  ({ membershipId, payload }: { membershipId: string; payload: UpdateEmployeePayload }) =>
    employeeManagementApi.updateEmployee(membershipId, payload),
)

export const resendEmployeeInvitation = createAsyncThunk(
  'employeeManagement/resendEmployeeInvitation',
  (membershipId: string) => employeeManagementApi.resendInvitation(membershipId),
)

export const createTeam = createAsyncThunk(
  'employeeManagement/createTeam',
  (payload: CreateTeamPayload) => employeeManagementApi.createTeam(payload),
)

export const updateTeam = createAsyncThunk(
  'employeeManagement/updateTeam',
  ({ teamId, payload }: { teamId: string; payload: UpdateTeamPayload }) =>
    employeeManagementApi.updateTeam(teamId, payload),
)

const employeeManagementSlice = createSlice({
  name: 'employeeManagement',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.status.employees = 'loading' })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status.employees = 'idle'
        state.employees = action.payload
      })
      .addCase(fetchEmployees.rejected, (state) => { state.status.employees = 'error' })

      .addCase(fetchTeams.pending, (state) => { state.status.teams = 'loading' })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.status.teams = 'idle'
        state.teams = action.payload
      })
      .addCase(fetchTeams.rejected, (state) => { state.status.teams = 'error' })

      .addCase(fetchEmployeesPage.pending, (state, action) => {
        state.status.employeesPage = 'loading'
        state.latestRequests.employeesPage = action.meta.requestId
      })
      .addCase(fetchEmployeesPage.fulfilled, (state, action) => {
        if (state.latestRequests.employeesPage !== action.meta.requestId) return
        state.status.employeesPage = 'idle'
        state.employeesPage = action.payload
        state.latestRequests.employeesPage = undefined
      })
      .addCase(fetchEmployeesPage.rejected, (state, action) => {
        if (state.latestRequests.employeesPage !== action.meta.requestId) return
        state.status.employeesPage = 'error'
        state.latestRequests.employeesPage = undefined
      })

      .addCase(fetchTeamsPage.pending, (state, action) => {
        state.status.teamsPage = 'loading'
        state.latestRequests.teamsPage = action.meta.requestId
      })
      .addCase(fetchTeamsPage.fulfilled, (state, action) => {
        if (state.latestRequests.teamsPage !== action.meta.requestId) return
        state.status.teamsPage = 'idle'
        state.teamsPage = action.payload
        state.latestRequests.teamsPage = undefined
      })
      .addCase(fetchTeamsPage.rejected, (state, action) => {
        if (state.latestRequests.teamsPage !== action.meta.requestId) return
        state.status.teamsPage = 'error'
        state.latestRequests.teamsPage = undefined
      })

      .addCase(inviteEmployee.pending, (state) => { state.status.invite = 'loading' })
      .addCase(inviteEmployee.fulfilled, (state, action) => {
        state.status.invite = 'idle'
        upsertById(state.employees, action.payload, 'membershipId')
        upsertById(state.employeesPage.data, action.payload, 'membershipId')
      })
      .addCase(inviteEmployee.rejected, (state) => { state.status.invite = 'error' })

      .addCase(updateEmployee.pending, (state) => { state.status.updateEmployee = 'loading' })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.status.updateEmployee = 'idle'
        upsertById(state.employees, action.payload, 'membershipId')
        upsertById(state.employeesPage.data, action.payload, 'membershipId')
      })
      .addCase(updateEmployee.rejected, (state) => { state.status.updateEmployee = 'error' })

      .addCase(resendEmployeeInvitation.pending, (state) => { state.status.resendInvite = 'loading' })
      .addCase(resendEmployeeInvitation.fulfilled, (state, action) => {
        state.status.resendInvite = 'idle'
        upsertById(state.employees, action.payload, 'membershipId')
        upsertById(state.employeesPage.data, action.payload, 'membershipId')
      })
      .addCase(resendEmployeeInvitation.rejected, (state) => { state.status.resendInvite = 'error' })

      .addCase(createTeam.pending, (state) => { state.status.createTeam = 'loading' })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.status.createTeam = 'idle'
        upsertById(state.teams, action.payload, 'id')
        upsertById(state.teamsPage.data, action.payload, 'id')
      })
      .addCase(createTeam.rejected, (state) => { state.status.createTeam = 'error' })

      .addCase(updateTeam.pending, (state) => { state.status.updateTeam = 'loading' })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.status.updateTeam = 'idle'
        upsertById(state.teams, action.payload, 'id')
        upsertById(state.teamsPage.data, action.payload, 'id')
      })
      .addCase(updateTeam.rejected, (state) => { state.status.updateTeam = 'error' })
  },
})

export default employeeManagementSlice.reducer
