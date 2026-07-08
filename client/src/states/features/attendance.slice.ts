import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  attendanceApi,
  type AttendanceException,
  type AttendancePolicyRules,
  type ClockPayload,
  type HistoryQueryParams,
  type WorkSession,
} from '@/lib/api/attendance.api'
import type { PaginatedResult } from '@/lib/api/pagination'

type LoadStatus = 'idle' | 'loading' | 'error'

const emptyHistoryPage: PaginatedResult<WorkSession> = { data: [], total: 0, page: 1, pageSize: 10 }

interface AttendanceState {
  currentSession: WorkSession | null
  history: PaginatedResult<WorkSession>
  historySummary: WorkSession[]
  orgSessions: WorkSession[]
  exceptions: AttendanceException[]
  effectivePolicy: AttendancePolicyRules | null
  latestRequests: {
    history?: string
  }
  status: {
    currentSession: LoadStatus
    history: LoadStatus
    historySummary: LoadStatus
    orgSessions: LoadStatus
    exceptions: LoadStatus
    clockIn: LoadStatus
    clockOut: LoadStatus
    break: LoadStatus
    review: LoadStatus
  }
}

const initialState: AttendanceState = {
  currentSession: null,
  history: emptyHistoryPage,
  historySummary: [],
  orgSessions: [],
  exceptions: [],
  effectivePolicy: null,
  latestRequests: {},
  status: {
    currentSession: 'idle',
    history: 'idle',
    historySummary: 'idle',
    orgSessions: 'idle',
    exceptions: 'idle',
    clockIn: 'idle',
    clockOut: 'idle',
    break: 'idle',
    review: 'idle',
  },
}

export const fetchCurrentSession = createAsyncThunk('attendance/fetchCurrentSession', () =>
  attendanceApi.currentSession()
)

export const fetchEffectivePolicy = createAsyncThunk('attendance/fetchEffectivePolicy', () =>
  attendanceApi.effectivePolicy()
)

export const fetchHistory = createAsyncThunk(
  'attendance/fetchHistory',
  (params?: HistoryQueryParams) => attendanceApi.history(params)
)

// Fetches a generous, unpaginated-feeling window of recent sessions for stat
// cards/charts that need broader coverage than the interactive table page.
export const fetchHistorySummary = createAsyncThunk('attendance/fetchHistorySummary', async () => {
  const result = await attendanceApi.history({ page: 1, pageSize: 50 })
  return result.data
})

export const fetchOrgSessions = createAsyncThunk('attendance/fetchOrgSessions', () =>
  attendanceApi.orgSessions()
)

export const fetchExceptions = createAsyncThunk('attendance/fetchExceptions', () =>
  attendanceApi.exceptions()
)

export const clockIn = createAsyncThunk('attendance/clockIn', (payload: ClockPayload) =>
  attendanceApi.clockIn(payload)
)

export const clockOut = createAsyncThunk('attendance/clockOut', (payload: ClockPayload) =>
  attendanceApi.clockOut(payload)
)

export const startBreak = createAsyncThunk('attendance/startBreak', (payload: ClockPayload) =>
  attendanceApi.startBreak(payload)
)

export const endBreak = createAsyncThunk('attendance/endBreak', (payload: ClockPayload) =>
  attendanceApi.endBreak(payload)
)

export const approveSession = createAsyncThunk('attendance/approveSession', (id: string) =>
  attendanceApi.approveSession(id)
)

export const rejectSession = createAsyncThunk('attendance/rejectSession', (id: string) =>
  attendanceApi.rejectSession(id)
)

export const lockSession = createAsyncThunk('attendance/lockSession', (id: string) =>
  attendanceApi.lockSession(id)
)

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearCurrentSession: (state) => {
      state.currentSession = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentSession.pending, (state) => { state.status.currentSession = 'loading' })
      .addCase(fetchCurrentSession.fulfilled, (state, action) => {
        state.status.currentSession = 'idle'
        state.currentSession = action.payload
      })
      .addCase(fetchCurrentSession.rejected, (state) => { state.status.currentSession = 'error' })

      .addCase(fetchEffectivePolicy.fulfilled, (state, action) => {
        state.effectivePolicy = action.payload
      })

      .addCase(fetchHistory.pending, (state, action) => {
        state.status.history = 'loading'
        state.latestRequests.history = action.meta.requestId
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        if (state.latestRequests.history !== action.meta.requestId) return
        state.status.history = 'idle'
        state.history = action.payload
        state.latestRequests.history = undefined
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        if (state.latestRequests.history !== action.meta.requestId) return
        state.status.history = 'error'
        state.latestRequests.history = undefined
      })

      .addCase(fetchHistorySummary.pending, (state) => { state.status.historySummary = 'loading' })
      .addCase(fetchHistorySummary.fulfilled, (state, action) => {
        state.status.historySummary = 'idle'
        state.historySummary = action.payload
      })
      .addCase(fetchHistorySummary.rejected, (state) => { state.status.historySummary = 'error' })

      .addCase(fetchOrgSessions.pending, (state) => { state.status.orgSessions = 'loading' })
      .addCase(fetchOrgSessions.fulfilled, (state, action) => {
        state.status.orgSessions = 'idle'
        state.orgSessions = action.payload
      })
      .addCase(fetchOrgSessions.rejected, (state) => { state.status.orgSessions = 'error' })

      .addCase(fetchExceptions.pending, (state) => { state.status.exceptions = 'loading' })
      .addCase(fetchExceptions.fulfilled, (state, action) => {
        state.status.exceptions = 'idle'
        state.exceptions = action.payload
      })
      .addCase(fetchExceptions.rejected, (state) => { state.status.exceptions = 'error' })

      .addCase(clockIn.pending, (state) => { state.status.clockIn = 'loading' })
      .addCase(clockIn.fulfilled, (state) => { state.status.clockIn = 'idle' })
      .addCase(clockIn.rejected, (state) => { state.status.clockIn = 'error' })

      .addCase(clockOut.pending, (state) => { state.status.clockOut = 'loading' })
      .addCase(clockOut.fulfilled, (state) => {
        state.status.clockOut = 'idle'
        state.currentSession = null
      })
      .addCase(clockOut.rejected, (state) => { state.status.clockOut = 'error' })

      .addCase(startBreak.pending, (state) => { state.status.break = 'loading' })
      .addCase(startBreak.fulfilled, (state) => { state.status.break = 'idle' })
      .addCase(startBreak.rejected, (state) => { state.status.break = 'error' })

      .addCase(endBreak.pending, (state) => { state.status.break = 'loading' })
      .addCase(endBreak.fulfilled, (state) => { state.status.break = 'idle' })
      .addCase(endBreak.rejected, (state) => { state.status.break = 'error' })

      .addCase(approveSession.pending, (state) => { state.status.review = 'loading' })
      .addCase(approveSession.fulfilled, (state, action) => {
        state.status.review = 'idle'
        state.orgSessions = state.orgSessions.map((session) =>
          session.id === action.payload.id ? action.payload : session
        )
      })
      .addCase(approveSession.rejected, (state) => { state.status.review = 'error' })

      .addCase(rejectSession.pending, (state) => { state.status.review = 'loading' })
      .addCase(rejectSession.fulfilled, (state, action) => {
        state.status.review = 'idle'
        state.orgSessions = state.orgSessions.map((session) =>
          session.id === action.payload.id ? action.payload : session
        )
      })
      .addCase(rejectSession.rejected, (state) => { state.status.review = 'error' })

      .addCase(lockSession.pending, (state) => { state.status.review = 'loading' })
      .addCase(lockSession.fulfilled, (state, action) => {
        state.status.review = 'idle'
        state.orgSessions = state.orgSessions.map((session) =>
          session.id === action.payload.id ? action.payload : session
        )
      })
      .addCase(lockSession.rejected, (state) => { state.status.review = 'error' })
  },
})

export const { clearCurrentSession } = attendanceSlice.actions
export default attendanceSlice.reducer
