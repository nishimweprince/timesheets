import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  schedulingApi,
  type CreateShiftAssignmentPayload,
  type CreateShiftPatternAssignmentPayload,
  type CreateShiftInstancePayload,
  type CreateShiftPatternPayload,
  type MyShift,
  type MyShiftQueryParams,
  type OverrideShiftInstancePayload,
  type ShiftAssignment,
  type ShiftInstance,
  type ShiftInstanceQueryParams,
  type ShiftPatternAssignment,
  type ShiftPattern,
  type UpdateShiftPatternAssignmentPayload,
  type UpdateShiftPatternPayload,
} from '@/lib/api/scheduling.api'
import type { PaginatedResult, PaginationParams } from '@/lib/api/pagination'

type LoadStatus = 'idle' | 'loading' | 'error'

const emptyPage = <T,>(): PaginatedResult<T> => ({ data: [], total: 0, page: 1, pageSize: 0 })

const LOOKUP_PAGE_SIZE = 100

interface SchedulingState {
  patterns: ShiftPattern[]
  instances: ShiftInstance[]
  assignments: ShiftAssignment[]
  myShifts: MyShift[]
  patternAssignments: ShiftPatternAssignment[]
  patternsPage: PaginatedResult<ShiftPattern>
  instancesPage: PaginatedResult<ShiftInstance>
  assignmentsPage: PaginatedResult<ShiftAssignment>
  patternAssignmentsPage: PaginatedResult<ShiftPatternAssignment>
  latestRequests: {
    patternsPage?: string
    instancesPage?: string
    assignmentsPage?: string
    patternAssignmentsPage?: string
  }
  status: {
    patterns: LoadStatus
    instances: LoadStatus
    assignments: LoadStatus
    myShifts: LoadStatus
    patternAssignments: LoadStatus
    patternsPage: LoadStatus
    instancesPage: LoadStatus
    assignmentsPage: LoadStatus
    patternAssignmentsPage: LoadStatus
    createPattern: LoadStatus
    updatePattern: LoadStatus
    archivePattern: LoadStatus
    createInstance: LoadStatus
    overrideInstance: LoadStatus
    cancelInstance: LoadStatus
    assign: LoadStatus
    updatePatternAssignment: LoadStatus
    cancelPatternAssignment: LoadStatus
  }
}

const initialState: SchedulingState = {
  patterns: [],
  instances: [],
  assignments: [],
  myShifts: [],
  patternAssignments: [],
  patternsPage: emptyPage(),
  instancesPage: emptyPage(),
  assignmentsPage: emptyPage(),
  patternAssignmentsPage: emptyPage(),
  latestRequests: {},
  status: {
    patterns: 'idle',
    instances: 'idle',
    assignments: 'idle',
    myShifts: 'idle',
    patternAssignments: 'idle',
    patternsPage: 'idle',
    instancesPage: 'idle',
    assignmentsPage: 'idle',
    patternAssignmentsPage: 'idle',
    createPattern: 'idle',
    updatePattern: 'idle',
    archivePattern: 'idle',
    createInstance: 'idle',
    overrideInstance: 'idle',
    cancelInstance: 'idle',
    assign: 'idle',
    updatePatternAssignment: 'idle',
    cancelPatternAssignment: 'idle',
  },
}

export const fetchPatterns = createAsyncThunk('scheduling/fetchPatterns', async () => {
  const result = await schedulingApi.patterns({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchInstances = createAsyncThunk(
  'scheduling/fetchInstances',
  async (params?: ShiftInstanceQueryParams) => {
    const result = await schedulingApi.instances({ page: 1, pageSize: LOOKUP_PAGE_SIZE, ...params })
    return result.data
  }
)

export const fetchAssignments = createAsyncThunk('scheduling/fetchAssignments', async () => {
  const result = await schedulingApi.assignments({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchMyShifts = createAsyncThunk(
  'scheduling/fetchMyShifts',
  (params: MyShiftQueryParams) => schedulingApi.myShifts(params)
)

export const fetchPatternAssignments = createAsyncThunk('scheduling/fetchPatternAssignments', async () => {
  const result = await schedulingApi.patternAssignments({ page: 1, pageSize: LOOKUP_PAGE_SIZE })
  return result.data
})

export const fetchPatternsPage = createAsyncThunk(
  'scheduling/fetchPatternsPage',
  (params?: PaginationParams) => schedulingApi.patterns(params)
)

export const fetchInstancesPage = createAsyncThunk(
  'scheduling/fetchInstancesPage',
  (params?: ShiftInstanceQueryParams) => schedulingApi.instances(params)
)

export const fetchAssignmentsPage = createAsyncThunk(
  'scheduling/fetchAssignmentsPage',
  (params?: PaginationParams) => schedulingApi.assignments(params)
)

export const fetchPatternAssignmentsPage = createAsyncThunk(
  'scheduling/fetchPatternAssignmentsPage',
  (params?: PaginationParams) => schedulingApi.patternAssignments(params)
)

export const createPattern = createAsyncThunk(
  'scheduling/createPattern',
  (payload: CreateShiftPatternPayload) => schedulingApi.createPattern(payload)
)

export const updatePattern = createAsyncThunk(
  'scheduling/updatePattern',
  ({ id, payload }: { id: string; payload: UpdateShiftPatternPayload }) =>
    schedulingApi.updatePattern(id, payload)
)

export const archivePattern = createAsyncThunk('scheduling/archivePattern', (id: string) =>
  schedulingApi.archivePattern(id)
)

export const createInstance = createAsyncThunk(
  'scheduling/createInstance',
  (payload: CreateShiftInstancePayload) => schedulingApi.createInstance(payload)
)

export const overrideInstance = createAsyncThunk(
  'scheduling/overrideInstance',
  ({ id, payload }: { id: string; payload: OverrideShiftInstancePayload }) =>
    schedulingApi.overrideInstance(id, payload)
)

export const cancelInstance = createAsyncThunk('scheduling/cancelInstance', (id: string) =>
  schedulingApi.cancelInstance(id)
)

export const createAssignment = createAsyncThunk(
  'scheduling/createAssignment',
  (payload: CreateShiftAssignmentPayload) => schedulingApi.createAssignment(payload)
)

export const createPatternAssignment = createAsyncThunk(
  'scheduling/createPatternAssignment',
  (payload: CreateShiftPatternAssignmentPayload) => schedulingApi.createPatternAssignment(payload)
)

export const updatePatternAssignment = createAsyncThunk(
  'scheduling/updatePatternAssignment',
  ({ id, payload }: { id: string; payload: UpdateShiftPatternAssignmentPayload }) =>
    schedulingApi.updatePatternAssignment(id, payload)
)

export const cancelPatternAssignment = createAsyncThunk(
  'scheduling/cancelPatternAssignment',
  (id: string) => schedulingApi.cancelPatternAssignment(id)
)

const schedulingSlice = createSlice({
  name: 'scheduling',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatterns.pending, (state) => { state.status.patterns = 'loading' })
      .addCase(fetchPatterns.fulfilled, (state, action) => {
        state.status.patterns = 'idle'
        state.patterns = action.payload
      })
      .addCase(fetchPatterns.rejected, (state) => { state.status.patterns = 'error' })

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

      .addCase(fetchMyShifts.pending, (state) => { state.status.myShifts = 'loading' })
      .addCase(fetchMyShifts.fulfilled, (state, action) => {
        state.status.myShifts = 'idle'
        state.myShifts = action.payload
      })
      .addCase(fetchMyShifts.rejected, (state) => { state.status.myShifts = 'error' })

      .addCase(fetchPatternAssignments.pending, (state) => { state.status.patternAssignments = 'loading' })
      .addCase(fetchPatternAssignments.fulfilled, (state, action) => {
        state.status.patternAssignments = 'idle'
        state.patternAssignments = action.payload
      })
      .addCase(fetchPatternAssignments.rejected, (state) => { state.status.patternAssignments = 'error' })

      .addCase(fetchPatternsPage.pending, (state, action) => {
        state.status.patternsPage = 'loading'
        state.latestRequests.patternsPage = action.meta.requestId
      })
      .addCase(fetchPatternsPage.fulfilled, (state, action) => {
        if (state.latestRequests.patternsPage !== action.meta.requestId) return
        state.status.patternsPage = 'idle'
        state.patternsPage = action.payload
        state.latestRequests.patternsPage = undefined
      })
      .addCase(fetchPatternsPage.rejected, (state, action) => {
        if (state.latestRequests.patternsPage !== action.meta.requestId) return
        state.status.patternsPage = 'error'
        state.latestRequests.patternsPage = undefined
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

      .addCase(fetchPatternAssignmentsPage.pending, (state, action) => {
        state.status.patternAssignmentsPage = 'loading'
        state.latestRequests.patternAssignmentsPage = action.meta.requestId
      })
      .addCase(fetchPatternAssignmentsPage.fulfilled, (state, action) => {
        if (state.latestRequests.patternAssignmentsPage !== action.meta.requestId) return
        state.status.patternAssignmentsPage = 'idle'
        state.patternAssignmentsPage = action.payload
        state.latestRequests.patternAssignmentsPage = undefined
      })
      .addCase(fetchPatternAssignmentsPage.rejected, (state, action) => {
        if (state.latestRequests.patternAssignmentsPage !== action.meta.requestId) return
        state.status.patternAssignmentsPage = 'error'
        state.latestRequests.patternAssignmentsPage = undefined
      })

      .addCase(createPattern.pending, (state) => { state.status.createPattern = 'loading' })
      .addCase(createPattern.fulfilled, (state, action) => {
        state.status.createPattern = 'idle'
        state.patterns.push(action.payload)
      })
      .addCase(createPattern.rejected, (state) => { state.status.createPattern = 'error' })

      .addCase(updatePattern.pending, (state) => { state.status.updatePattern = 'loading' })
      .addCase(updatePattern.fulfilled, (state, action) => {
        state.status.updatePattern = 'idle'
        const idx = state.patterns.findIndex((p) => p.id === action.payload.id)
        if (idx >= 0) state.patterns[idx] = action.payload
      })
      .addCase(updatePattern.rejected, (state) => { state.status.updatePattern = 'error' })

      .addCase(archivePattern.pending, (state) => { state.status.archivePattern = 'loading' })
      .addCase(archivePattern.fulfilled, (state, action) => {
        state.status.archivePattern = 'idle'
        const idx = state.patterns.findIndex((p) => p.id === action.payload.id)
        if (idx >= 0) state.patterns[idx] = action.payload
      })
      .addCase(archivePattern.rejected, (state) => { state.status.archivePattern = 'error' })

      .addCase(createInstance.pending, (state) => { state.status.createInstance = 'loading' })
      .addCase(createInstance.fulfilled, (state, action) => {
        state.status.createInstance = 'idle'
        state.instances.push(action.payload)
      })
      .addCase(createInstance.rejected, (state) => { state.status.createInstance = 'error' })

      .addCase(overrideInstance.pending, (state) => { state.status.overrideInstance = 'loading' })
      .addCase(overrideInstance.fulfilled, (state, action) => {
        state.status.overrideInstance = 'idle'
        const idx = state.instances.findIndex((i) => i.id === action.payload.id)
        if (idx >= 0) state.instances[idx] = action.payload
      })
      .addCase(overrideInstance.rejected, (state) => { state.status.overrideInstance = 'error' })

      .addCase(cancelInstance.pending, (state) => { state.status.cancelInstance = 'loading' })
      .addCase(cancelInstance.fulfilled, (state, action) => {
        state.status.cancelInstance = 'idle'
        const idx = state.instances.findIndex((i) => i.id === action.payload.id)
        if (idx >= 0) state.instances[idx] = action.payload
      })
      .addCase(cancelInstance.rejected, (state) => { state.status.cancelInstance = 'error' })

      .addCase(createAssignment.pending, (state) => { state.status.assign = 'loading' })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.status.assign = 'idle'
        state.assignments.push(action.payload)
      })
      .addCase(createAssignment.rejected, (state) => { state.status.assign = 'error' })

      .addCase(createPatternAssignment.pending, (state) => { state.status.assign = 'loading' })
      .addCase(createPatternAssignment.fulfilled, (state, action) => {
        state.status.assign = 'idle'
        state.patternAssignments.push(action.payload)
      })
      .addCase(createPatternAssignment.rejected, (state) => { state.status.assign = 'error' })

      .addCase(updatePatternAssignment.pending, (state) => { state.status.updatePatternAssignment = 'loading' })
      .addCase(updatePatternAssignment.fulfilled, (state, action) => {
        state.status.updatePatternAssignment = 'idle'
        const idx = state.patternAssignments.findIndex((a) => a.id === action.payload.id)
        if (idx >= 0) state.patternAssignments[idx] = action.payload
      })
      .addCase(updatePatternAssignment.rejected, (state) => { state.status.updatePatternAssignment = 'error' })

      .addCase(cancelPatternAssignment.pending, (state) => { state.status.cancelPatternAssignment = 'loading' })
      .addCase(cancelPatternAssignment.fulfilled, (state, action) => {
        state.status.cancelPatternAssignment = 'idle'
        const idx = state.patternAssignments.findIndex((a) => a.id === action.payload.id)
        if (idx >= 0) state.patternAssignments[idx] = action.payload
      })
      .addCase(cancelPatternAssignment.rejected, (state) => { state.status.cancelPatternAssignment = 'error' })
  },
})

export default schedulingSlice.reducer
