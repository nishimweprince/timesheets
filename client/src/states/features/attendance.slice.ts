import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { attendanceApi, type AttendanceException, type ClockPayload, type WorkSession } from '@/lib/api/attendance.api'

type LoadStatus = 'idle' | 'loading' | 'error'

interface AttendanceState {
  currentSession: WorkSession | null
  history: WorkSession[]
  orgSessions: WorkSession[]
  exceptions: AttendanceException[]
  status: {
    currentSession: LoadStatus
    history: LoadStatus
    orgSessions: LoadStatus
    exceptions: LoadStatus
    clockIn: LoadStatus
    clockOut: LoadStatus
    break: LoadStatus
  }
}

const initialState: AttendanceState = {
  currentSession: null,
  history: [],
  orgSessions: [],
  exceptions: [],
  status: {
    currentSession: 'idle',
    history: 'idle',
    orgSessions: 'idle',
    exceptions: 'idle',
    clockIn: 'idle',
    clockOut: 'idle',
    break: 'idle',
  },
}

export const fetchCurrentSession = createAsyncThunk('attendance/fetchCurrentSession', () =>
  attendanceApi.currentSession()
)

export const fetchHistory = createAsyncThunk('attendance/fetchHistory', () =>
  attendanceApi.history()
)

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

      .addCase(fetchHistory.pending, (state) => { state.status.history = 'loading' })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.status.history = 'idle'
        state.history = action.payload
      })
      .addCase(fetchHistory.rejected, (state) => { state.status.history = 'error' })

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
  },
})

export const { clearCurrentSession } = attendanceSlice.actions
export default attendanceSlice.reducer
