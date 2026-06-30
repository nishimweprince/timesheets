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

type LoadStatus = 'idle' | 'loading' | 'error'

interface SchedulingState {
  templates: ShiftTemplate[]
  instances: ShiftInstance[]
  assignments: ShiftAssignment[]
  status: {
    templates: LoadStatus
    instances: LoadStatus
    assignments: LoadStatus
    createTemplate: LoadStatus
    createInstance: LoadStatus
    assign: LoadStatus
  }
}

const initialState: SchedulingState = {
  templates: [],
  instances: [],
  assignments: [],
  status: {
    templates: 'idle',
    instances: 'idle',
    assignments: 'idle',
    createTemplate: 'idle',
    createInstance: 'idle',
    assign: 'idle',
  },
}

export const fetchTemplates = createAsyncThunk('scheduling/fetchTemplates', () =>
  schedulingApi.templates()
)

export const fetchInstances = createAsyncThunk('scheduling/fetchInstances', () =>
  schedulingApi.instances()
)

export const fetchAssignments = createAsyncThunk('scheduling/fetchAssignments', () =>
  schedulingApi.assignments()
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
