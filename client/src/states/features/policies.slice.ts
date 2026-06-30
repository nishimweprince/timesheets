import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  policiesApi,
  type AttendancePolicy,
  type AttendancePolicyAssignment,
  type CreatePolicyAssignmentPayload,
  type CreatePolicyPayload,
  type CreateWorkSitePayload,
  type WorkSite,
} from '@/lib/api/policies.api'
import type { PaginatedResult, PaginationParams } from '@/lib/api/pagination'

type LoadStatus = 'idle' | 'loading' | 'error'

const emptyPage = <T,>(): PaginatedResult<T> => ({ data: [], total: 0, page: 1, pageSize: 10 })

// Lookup pageSize used for full-list consumers (assign dialog, summary cards)
// that need broader coverage than the interactive table page.
export const LOOKUP_PAGE_SIZE = 100

interface PoliciesState {
  policies: AttendancePolicy[]
  workSites: WorkSite[]
  assignments: AttendancePolicyAssignment[]
  policiesPage: PaginatedResult<AttendancePolicy>
  workSitesPage: PaginatedResult<WorkSite>
  latestRequests: {
    policiesPage?: string
    workSitesPage?: string
  }
  status: {
    policies: LoadStatus
    workSites: LoadStatus
    assignments: LoadStatus
    policiesPage: LoadStatus
    workSitesPage: LoadStatus
    createPolicy: LoadStatus
    assignPolicy: LoadStatus
    createWorkSite: LoadStatus
  }
}

const initialState: PoliciesState = {
  policies: [],
  workSites: [],
  assignments: [],
  policiesPage: emptyPage(),
  workSitesPage: emptyPage(),
  latestRequests: {},
  status: {
    policies: 'idle',
    workSites: 'idle',
    assignments: 'idle',
    policiesPage: 'idle',
    workSitesPage: 'idle',
    createPolicy: 'idle',
    assignPolicy: 'idle',
    createWorkSite: 'idle',
  },
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((existing) => existing.id === item.id)
  if (index >= 0) items[index] = item
  else items.unshift(item)
}

export const fetchPolicies = createAsyncThunk('policies/fetchPolicies', async () => {
  const result = await policiesApi.policiesPage({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchWorkSites = createAsyncThunk('policies/fetchWorkSites', async () => {
  const result = await policiesApi.workSitesPage({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchAssignments = createAsyncThunk('policies/fetchAssignments', async () => {
  const result = await policiesApi.assignmentsPage({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchPoliciesPage = createAsyncThunk(
  'policies/fetchPoliciesPage',
  (params?: PaginationParams) => policiesApi.policiesPage(params),
)

export const fetchWorkSitesPage = createAsyncThunk(
  'policies/fetchWorkSitesPage',
  (params?: PaginationParams) => policiesApi.workSitesPage(params),
)

export const createPolicy = createAsyncThunk(
  'policies/createPolicy',
  (payload: CreatePolicyPayload) => policiesApi.createPolicy(payload),
)

export const assignPolicy = createAsyncThunk(
  'policies/assignPolicy',
  (payload: CreatePolicyAssignmentPayload) => policiesApi.assignPolicy(payload),
)

export const createWorkSite = createAsyncThunk(
  'policies/createWorkSite',
  (payload: CreateWorkSitePayload) => policiesApi.createWorkSite(payload),
)

const policiesSlice = createSlice({
  name: 'policies',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPolicies.pending, (state) => {
        state.status.policies = 'loading'
      })
      .addCase(fetchPolicies.fulfilled, (state, action) => {
        state.status.policies = 'idle'
        state.policies = action.payload
      })
      .addCase(fetchPolicies.rejected, (state) => {
        state.status.policies = 'error'
      })

      .addCase(fetchWorkSites.pending, (state) => {
        state.status.workSites = 'loading'
      })
      .addCase(fetchWorkSites.fulfilled, (state, action) => {
        state.status.workSites = 'idle'
        state.workSites = action.payload
      })
      .addCase(fetchWorkSites.rejected, (state) => {
        state.status.workSites = 'error'
      })

      .addCase(fetchAssignments.pending, (state) => {
        state.status.assignments = 'loading'
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.status.assignments = 'idle'
        state.assignments = action.payload
      })
      .addCase(fetchAssignments.rejected, (state) => {
        state.status.assignments = 'error'
      })

      .addCase(fetchPoliciesPage.pending, (state, action) => {
        state.status.policiesPage = 'loading'
        state.latestRequests.policiesPage = action.meta.requestId
      })
      .addCase(fetchPoliciesPage.fulfilled, (state, action) => {
        if (state.latestRequests.policiesPage !== action.meta.requestId) return
        state.status.policiesPage = 'idle'
        state.policiesPage = action.payload
        state.latestRequests.policiesPage = undefined
      })
      .addCase(fetchPoliciesPage.rejected, (state, action) => {
        if (state.latestRequests.policiesPage !== action.meta.requestId) return
        state.status.policiesPage = 'error'
        state.latestRequests.policiesPage = undefined
      })

      .addCase(fetchWorkSitesPage.pending, (state, action) => {
        state.status.workSitesPage = 'loading'
        state.latestRequests.workSitesPage = action.meta.requestId
      })
      .addCase(fetchWorkSitesPage.fulfilled, (state, action) => {
        if (state.latestRequests.workSitesPage !== action.meta.requestId) return
        state.status.workSitesPage = 'idle'
        state.workSitesPage = action.payload
        state.latestRequests.workSitesPage = undefined
      })
      .addCase(fetchWorkSitesPage.rejected, (state, action) => {
        if (state.latestRequests.workSitesPage !== action.meta.requestId) return
        state.status.workSitesPage = 'error'
        state.latestRequests.workSitesPage = undefined
      })

      .addCase(createPolicy.pending, (state) => {
        state.status.createPolicy = 'loading'
      })
      .addCase(createPolicy.fulfilled, (state, action) => {
        state.status.createPolicy = 'idle'
        upsertById(state.policies, action.payload)
        upsertById(state.policiesPage.data, action.payload)
      })
      .addCase(createPolicy.rejected, (state) => {
        state.status.createPolicy = 'error'
      })

      .addCase(assignPolicy.pending, (state) => {
        state.status.assignPolicy = 'loading'
      })
      .addCase(assignPolicy.fulfilled, (state, action) => {
        state.status.assignPolicy = 'idle'
        upsertById(state.assignments, action.payload)
      })
      .addCase(assignPolicy.rejected, (state) => {
        state.status.assignPolicy = 'error'
      })

      .addCase(createWorkSite.pending, (state) => {
        state.status.createWorkSite = 'loading'
      })
      .addCase(createWorkSite.fulfilled, (state, action) => {
        state.status.createWorkSite = 'idle'
        upsertById(state.workSites, action.payload)
        upsertById(state.workSitesPage.data, action.payload)
      })
      .addCase(createWorkSite.rejected, (state) => {
        state.status.createWorkSite = 'error'
      })
  },
})

export default policiesSlice.reducer