import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  reportsApi,
  type ExceptionReportRow,
  type ExceptionsReportParams,
  type HoursByEmployeeParams,
  type HoursByEmployeeRow,
} from '@/lib/api/reports.api'
import type { PaginatedResult } from '@/lib/api/pagination'

type LoadStatus = 'idle' | 'loading' | 'error'

const emptyPage = <T,>(): PaginatedResult<T> => ({ data: [], total: 0, page: 1, pageSize: 10 })

interface ReportsState {
  hoursByEmployee: PaginatedResult<HoursByEmployeeRow>
  exceptions: PaginatedResult<ExceptionReportRow>
  latestRequests: {
    hoursByEmployee?: string
    exceptions?: string
  }
  status: {
    hoursByEmployee: LoadStatus
    exceptions: LoadStatus
  }
}

const initialState: ReportsState = {
  hoursByEmployee: emptyPage(),
  exceptions: emptyPage(),
  latestRequests: {},
  status: {
    hoursByEmployee: 'idle',
    exceptions: 'idle',
  },
}

export const fetchHoursByEmployee = createAsyncThunk(
  'reports/fetchHoursByEmployee',
  (params?: HoursByEmployeeParams) => reportsApi.hoursByEmployee(params),
)

export const fetchExceptionsReport = createAsyncThunk(
  'reports/fetchExceptionsReport',
  (params?: ExceptionsReportParams) => reportsApi.exceptions(params),
)

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHoursByEmployee.pending, (state, action) => {
        state.status.hoursByEmployee = 'loading'
        state.latestRequests.hoursByEmployee = action.meta.requestId
      })
      .addCase(fetchHoursByEmployee.fulfilled, (state, action) => {
        if (state.latestRequests.hoursByEmployee !== action.meta.requestId) return
        state.status.hoursByEmployee = 'idle'
        state.hoursByEmployee = action.payload
        state.latestRequests.hoursByEmployee = undefined
      })
      .addCase(fetchHoursByEmployee.rejected, (state, action) => {
        if (state.latestRequests.hoursByEmployee !== action.meta.requestId) return
        state.status.hoursByEmployee = 'error'
        state.latestRequests.hoursByEmployee = undefined
      })

      .addCase(fetchExceptionsReport.pending, (state, action) => {
        state.status.exceptions = 'loading'
        state.latestRequests.exceptions = action.meta.requestId
      })
      .addCase(fetchExceptionsReport.fulfilled, (state, action) => {
        if (state.latestRequests.exceptions !== action.meta.requestId) return
        state.status.exceptions = 'idle'
        state.exceptions = action.payload
        state.latestRequests.exceptions = undefined
      })
      .addCase(fetchExceptionsReport.rejected, (state, action) => {
        if (state.latestRequests.exceptions !== action.meta.requestId) return
        state.status.exceptions = 'error'
        state.latestRequests.exceptions = undefined
      })
  },
})

export default reportsSlice.reducer
