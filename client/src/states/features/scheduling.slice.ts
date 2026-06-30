import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  schedulingApi,
  type CreateShiftAssignmentPayload,
  type CreateShiftInstancePayload,
  type CreateShiftTemplatePayload,
  type ShiftAssignment,
  type ShiftInstance,
  type ShiftTemplate,
} from '@/lib/api/scheduling.api'
import type { PaginatedResult, PaginationParams } from '@/lib/api/pagination'

type LoadStatus = 'idle' | 'loading' | 'error'

const emptyPage = <T,>(): PaginatedResult<T> => ({ data: [], total: 0, page: 1, pageSize: 10 })

// Lookup pageSize used for full-list consumers (dropdowns, cross-page
// calculations) that need broader coverage than the interactive table page.
const LOOKUP_PAGE_SIZE = 100

interface SchedulingState {
  templates: ShiftTemplate[]
  instances: ShiftInstance[]
  assignments: ShiftAssignment[]
  templatesPage: PaginatedResult<ShiftTemplate>
  instancesPage: PaginatedResult<ShiftInstance>
  assignmentsPage: PaginatedResult<ShiftAssignment>
  latestRequests: {
    templatesPage?: string
    instancesPage?: string
    assignmentsPage?: string
  }
  status: {
    templates: LoadStatus
    instances: LoadStatus
    assignments: LoadStatus
    templatesPage: LoadStatus
    instancesPage: LoadStatus
    assignmentsPage: LoadStatus
    createTemplate: LoadStatus
    createInstance: LoadStatus
    assign: LoadStatus
  }
}

const initialState: SchedulingState = {
  templates: [],
  instances: [],
  assignments: [],
  templatesPage: emptyPage(),
  instancesPage: emptyPage(),
  assignmentsPage: emptyPage(),
  latestRequests: {},
  status: {
    templates: 'idle',
    instances: 'idle',
    assignments: 'idle',
    templatesPage: 'idle',
    instancesPage: 'idle',
    assignmentsPage: 'idle',
    createTemplate: 'idle',
    createInstance: 'idle',
    assign: 'idle',
  },
}

export const fetchTemplates = createAsyncThunk('scheduling/fetchTemplates', async () => {
  const result = await schedulingApi.templates({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchInstances = createAsyncThunk('scheduling/fetchInstances', async () => {
  const result = await schedulingApi.instances({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchAssignments = createAsyncThunk('scheduling/fetchAssignments', async () => {
  const result = await schedulingApi.assignments({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchTemplatesPage = createAsyncThunk(
  'scheduling/fetchTemplatesPage',
  (params?: PaginationParams) => schedulingApi.templates(params)
)

export const fetchInstancesPage = createAsyncThunk(
  'scheduling/fetchInstancesPage',
  (params?: PaginationParams) => schedulingApi.instances(params)
)

export const fetchAssignmentsPage = createAsyncThunk(
  'scheduling/fetchAssignmentsPage',
  (params?: PaginationParams) => schedulingApi.assignments(params)
)

export const createTemplate = createAsyncThunk(
  'scheduling/createTemplate',
  (payload: CreateShiftTemplatePayload) => schedulingApi.createTemplate(payload)
)

export const createInstance = createAsyncThunk(
  'scheduling/createInstance',
  (payload: CreateShiftInstancePayload) => schedulingApi.createInstance(payload)
)

export const createAssignment = createAsyncThunk(
  'scheduling/createAssignment',
  (payload: CreateShiftAssignmentPayload) => schedulingApi.createAssignment(payload)
)

const schedulingSlice = createSlice({
  name: 'scheduling',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => { state.status.templates = 'loading' })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.status.templates = 'idle'
        state.templates = action.payload
      })
      .addCase(fetchTemplates.rejected, (state) => { state.status.templates = 'error' })

      .addCase(fetchInstances.pending, (state) => { state.status.instances = 'loading' })
      .addCase(fetchInstances.fulfilled, (state, action) => {
        state.status.instances = 'idle'
        state.instances = action.payload
      })
      .addCase(fetchInstances.rejected, (state) => { state.status.instances = 'error' })

      .addCase(fetchAssignments.pending, (state) => { state.status.assignments = 'loading' })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.status.assignments = 'idle'
        state.assignments = action.payload
      })
      .addCase(fetchAssignments.rejected, (state) => { state.status.assignments = 'error' })

      .addCase(fetchTemplatesPage.pending, (state, action) => {
        state.status.templatesPage = 'loading'
        state.latestRequests.templatesPage = action.meta.requestId
      })
      .addCase(fetchTemplatesPage.fulfilled, (state, action) => {
        if (state.latestRequests.templatesPage !== action.meta.requestId) return
        state.status.templatesPage = 'idle'
        state.templatesPage = action.payload
        state.latestRequests.templatesPage = undefined
      })
      .addCase(fetchTemplatesPage.rejected, (state, action) => {
        if (state.latestRequests.templatesPage !== action.meta.requestId) return
        state.status.templatesPage = 'error'
        state.latestRequests.templatesPage = undefined
      })

      .addCase(fetchInstancesPage.pending, (state, action) => {
        state.status.instancesPage = 'loading'
        state.latestRequests.instancesPage = action.meta.requestId
      })
      .addCase(fetchInstancesPage.fulfilled, (state, action) => {
        if (state.latestRequests.instancesPage !== action.meta.requestId) return
        state.status.instancesPage = 'idle'
        state.instancesPage = action.payload
        state.latestRequests.instancesPage = undefined
      })
      .addCase(fetchInstancesPage.rejected, (state, action) => {
        if (state.latestRequests.instancesPage !== action.meta.requestId) return
        state.status.instancesPage = 'error'
        state.latestRequests.instancesPage = undefined
      })

      .addCase(fetchAssignmentsPage.pending, (state, action) => {
        state.status.assignmentsPage = 'loading'
        state.latestRequests.assignmentsPage = action.meta.requestId
      })
      .addCase(fetchAssignmentsPage.fulfilled, (state, action) => {
        if (state.latestRequests.assignmentsPage !== action.meta.requestId) return
        state.status.assignmentsPage = 'idle'
        state.assignmentsPage = action.payload
        state.latestRequests.assignmentsPage = undefined
      })
      .addCase(fetchAssignmentsPage.rejected, (state, action) => {
        if (state.latestRequests.assignmentsPage !== action.meta.requestId) return
        state.status.assignmentsPage = 'error'
        state.latestRequests.assignmentsPage = undefined
      })

      .addCase(createTemplate.pending, (state) => { state.status.createTemplate = 'loading' })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.status.createTemplate = 'idle'
        state.templates.push(action.payload)
      })
      .addCase(createTemplate.rejected, (state) => { state.status.createTemplate = 'error' })

      .addCase(createInstance.pending, (state) => { state.status.createInstance = 'loading' })
      .addCase(createInstance.fulfilled, (state, action) => {
        state.status.createInstance = 'idle'
        state.instances.push(action.payload)
      })
      .addCase(createInstance.rejected, (state) => { state.status.createInstance = 'error' })

      .addCase(createAssignment.pending, (state) => { state.status.assign = 'loading' })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.status.assign = 'idle'
        state.assignments.push(action.payload)
      })
      .addCase(createAssignment.rejected, (state) => { state.status.assign = 'error' })
  },
})

export default schedulingSlice.reducer
