import { apiRequest } from './client'
import { toQueryString, type PaginatedResult, type PaginationParams } from './pagination'
import type { ClockDeviceContext } from '../device'

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
  plannedShiftPatternId: string | null
  plannedShiftPatternAssignmentId: string | null
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

export const AttendanceExceptionStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const

export type AttendanceExceptionStatus =
  (typeof AttendanceExceptionStatus)[keyof typeof AttendanceExceptionStatus]

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
  updatedAt?: string
}

export interface ExceptionsQueryParams {
  status?: AttendanceExceptionStatus | 'ALL'
  severity?: string
}

export interface AttendanceEventDetail {
  id: string
  eventType: string
  eventSource: string
  serverReceivedAt: string
  clientReportedAt: string | null
  clientTimezone: string | null
  clientUtcOffsetMinutes: number | null
  location: {
    latitude: number
    longitude: number
    accuracyMeters: number | null
    source: string | null
    capturedAt: string | null
    permissionState: string | null
  } | null
  geofenceResult: string | null
  matchedWorkSiteId: string | null
  ipAddress: string | null
  networkContext: Record<string, unknown> | null
  deviceContext: Record<string, unknown> | null
  cameraRequired: boolean
  photoUrl: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
}

export interface WorkSessionDetail {
  session: WorkSession
  events: AttendanceEventDetail[]
  exceptions: AttendanceException[]
}

export interface OrgSessionsParams {
  from?: string
  to?: string
}

export interface ClockPayload {
  requestedShiftAssignmentId?: string
  requestedShiftInstanceId?: string
  requestedShiftPatternAssignmentId?: string
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
  device?: ClockDeviceContext | Record<string, unknown>
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

  orgSessions(params?: OrgSessionsParams): Promise<WorkSession[]> {
    return apiRequest<WorkSession[]>(`/attendance/sessions${toQueryString({ ...params })}`)
  },

  session(id: string): Promise<WorkSession | null> {
    return apiRequest<WorkSession | null>(`/attendance/sessions/${id}`)
  },

  sessionDetail(id: string): Promise<WorkSessionDetail> {
    return apiRequest<WorkSessionDetail>(`/attendance/sessions/${id}/detail`)
  },

  approveSession(id: string): Promise<WorkSession> {
    return apiRequest<WorkSession>(`/attendance/sessions/${id}/approve`, { method: 'POST' })
  },

  rejectSession(id: string): Promise<WorkSession> {
    return apiRequest<WorkSession>(`/attendance/sessions/${id}/reject`, { method: 'POST' })
  },

  lockSession(id: string): Promise<WorkSession> {
    return apiRequest<WorkSession>(`/attendance/sessions/${id}/lock`, { method: 'POST' })
  },

  exceptions(params?: ExceptionsQueryParams): Promise<AttendanceException[]> {
    return apiRequest<AttendanceException[]>(
      `/attendance/exceptions${toQueryString({ ...params })}`,
    )
  },

  exception(id: string): Promise<AttendanceException> {
    return apiRequest<AttendanceException>(`/attendance/exceptions/${id}`)
  },

  resolveException(id: string): Promise<AttendanceException> {
    return apiRequest<AttendanceException>(`/attendance/exceptions/${id}/resolve`, {
      method: 'POST',
    })
  },

  dismissException(id: string): Promise<AttendanceException> {
    return apiRequest<AttendanceException>(`/attendance/exceptions/${id}/dismiss`, {
      method: 'POST',
    })
  },

  effectivePolicy(): Promise<AttendancePolicyRules> {
    return apiRequest<AttendancePolicyRules>('/attendance/me/effective-policy')
  },
}
