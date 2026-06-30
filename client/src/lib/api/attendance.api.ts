import { apiRequest } from './client'
import { toQueryString, type PaginatedResult, type PaginationParams } from './pagination'

export const WorkSessionStatus = {
  OPEN: 'OPEN',
  CLOCKED_OUT: 'CLOCKED_OUT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  LOCKED: 'LOCKED',
  CANCELLED: 'CANCELLED',
} as const

export type WorkSessionStatus = typeof WorkSessionStatus[keyof typeof WorkSessionStatus]

export interface WorkSession {
  id: string
  organizationId: string
  employeeMembershipId: string
  plannedShiftInstanceId: string | null
  plannedShiftAssignmentId: string | null
  status: WorkSessionStatus
  resolutionType: string
  reviewStatus: string
  actualClockInAt: string
  actualClockOutAt: string | null
  grossMinutes: number | null
  breakMinutes: number | null
  netMinutes: number | null
  clockInEventId: string | null
  clockOutEventId: string | null
  policySnapshot: Record<string, unknown>
  policyResult: Record<string, unknown>
  hasExceptions: boolean
  exceptionCount: number
  createdAt: string
}

export interface AttendanceException {
  id: string
  organizationId: string
  employeeMembershipId: string
  workSessionId: string | null
  attendanceEventId: string | null
  code: string
  severity: string
  message: string
  status: string
  createdAt: string
}

export interface ClockPayload {
  requestedShiftAssignmentId?: string
  clientReportedAt?: string
  clientTimezone?: string
  clientUtcOffsetMinutes?: number
  location?: {
    latitude: number
    longitude: number
    accuracyMeters?: number
    source?: string
    capturedAt?: string
    permissionState?: string
  }
  device?: Record<string, unknown>
  cameraEvidenceId?: string
  reason?: string
}

export interface AttendancePolicyRules {
  requireClockInPhoto: boolean
  requireClockOutPhoto: boolean
  requireLocation: boolean
}

function clockHeaders(): Record<string, string> {
  return { 'Idempotency-Key': crypto.randomUUID() }
}

export type HistoryStatusGroup = 'Approved' | 'Pending' | 'Draft'

export interface HistoryQueryParams extends PaginationParams {
  status?: HistoryStatusGroup
}

export const attendanceApi = {
  currentSession(): Promise<WorkSession | null> {
    return apiRequest<WorkSession | null>('/attendance/me/current-session')
  },

  history(params?: HistoryQueryParams): Promise<PaginatedResult<WorkSession>> {
    return apiRequest<PaginatedResult<WorkSession>>(
      `/attendance/me/history${toQueryString({ ...params })}`,
    )
  },

  clockIn(body: ClockPayload): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/attendance/me/clock-in', {
      method: 'POST',
      body,
      headers: clockHeaders(),
    })
  },

  clockOut(body: ClockPayload): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/attendance/me/clock-out', {
      method: 'POST',
      body,
      headers: clockHeaders(),
    })
  },

  startBreak(body: ClockPayload): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/attendance/me/breaks/start', {
      method: 'POST',
      body,
      headers: clockHeaders(),
    })
  },

  endBreak(body: ClockPayload): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/attendance/me/breaks/end', {
      method: 'POST',
      body,
      headers: clockHeaders(),
    })
  },

  orgSessions(): Promise<WorkSession[]> {
    return apiRequest<WorkSession[]>('/attendance/sessions')
  },

  session(id: string): Promise<WorkSession | null> {
    return apiRequest<WorkSession | null>(`/attendance/sessions/${id}`)
  },

  exceptions(): Promise<AttendanceException[]> {
    return apiRequest<AttendanceException[]>('/attendance/exceptions')
  },

  effectivePolicy(): Promise<AttendancePolicyRules> {
    return apiRequest<AttendancePolicyRules>('/attendance/me/effective-policy')
  },
}
