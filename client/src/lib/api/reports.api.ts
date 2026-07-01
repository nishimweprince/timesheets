import { apiRequest } from './client'
import { toQueryString, type PaginatedResult, type PaginationParams } from './pagination'

export interface HoursByEmployeeRow {
  membershipId: string
  firstName: string | null
  lastName: string | null
  employeeNumber: string | null
  jobTitle: string | null
  sessionCount: number
  netMinutes: number
  grossMinutes: number
  breakMinutes: number
  exceptionCount: number
}

export interface ExceptionReportRow {
  id: string
  membershipId: string
  firstName: string | null
  lastName: string | null
  workSessionId: string | null
  code: string
  severity: string
  message: string
  status: string
  createdAt: string
}

export interface HoursByEmployeeParams extends PaginationParams {
  startDate?: string
  endDate?: string
}

export interface ExceptionsReportParams extends PaginationParams {
  startDate?: string
  endDate?: string
  severity?: string
  status?: string
}

export const reportsApi = {
  hoursByEmployee(params?: HoursByEmployeeParams): Promise<PaginatedResult<HoursByEmployeeRow>> {
    return apiRequest<PaginatedResult<HoursByEmployeeRow>>(
      `/reports/hours-by-employee${toQueryString({ ...params })}`,
    )
  },

  exceptions(params?: ExceptionsReportParams): Promise<PaginatedResult<ExceptionReportRow>> {
    return apiRequest<PaginatedResult<ExceptionReportRow>>(
      `/reports/exceptions${toQueryString({ ...params })}`,
    )
  },
}
