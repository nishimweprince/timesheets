import { apiRequest } from './client'
import { toQueryString, type PaginatedResult, type PaginationParams } from './pagination'

export const ShiftPatternFreq = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
} as const

export type ShiftPatternFreq = typeof ShiftPatternFreq[keyof typeof ShiftPatternFreq]

export interface ShiftPattern {
  id: string
  organizationId: string
  name: string
  timezone: string
  startTime: string
  endTime: string
  workSiteId: string | null
  assignedEmployeeMembershipId: string | null
  rrule: string | null
  freq: ShiftPatternFreq | null
  daysOfWeek: number[]
  effectiveFrom: string
  effectiveUntil: string | null
  active: boolean
  createdAt: string
}

export const ShiftInstanceStatus = {
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  MODIFIED: 'MODIFIED',
  COMPLETED: 'COMPLETED',
} as const

export type ShiftInstanceStatus = typeof ShiftInstanceStatus[keyof typeof ShiftInstanceStatus]

export interface ShiftInstance {
  id: string
  organizationId: string
  patternId: string | null
  workSiteId: string | null
  shiftDate: string
  startAt: string
  endAt: string
  status: ShiftInstanceStatus
  createdAt: string
}

export const ShiftAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  REASSIGNED: 'REASSIGNED',
} as const

export type ShiftAssignmentStatus = typeof ShiftAssignmentStatus[keyof typeof ShiftAssignmentStatus]

export interface ShiftAssignment {
  id: string
  organizationId: string
  employeeMembershipId: string
  shiftInstanceId: string
  status: ShiftAssignmentStatus
  createdAt: string
}

export interface ShiftPatternAssignment {
  id: string
  organizationId: string
  employeeMembershipId: string
  shiftPatternId: string
  status: ShiftAssignmentStatus
  effectiveFrom: string | null
  effectiveUntil: string | null
  createdAt: string
}

export interface CreateShiftPatternPayload {
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  effectiveFrom: string
  effectiveUntil?: string
  freq?: ShiftPatternFreq
  timezone?: string
  workSiteId?: string
  assignedEmployeeMembershipId?: string
}

export interface UpdateShiftPatternPayload {
  name?: string
  startTime?: string
  endTime?: string
  daysOfWeek?: number[]
  effectiveFrom?: string
  effectiveUntil?: string
  freq?: ShiftPatternFreq
  timezone?: string
  workSiteId?: string
  assignedEmployeeMembershipId?: string
  active?: boolean
}

export interface CreateShiftInstancePayload {
  patternId?: string
  workSiteId?: string
  startAt: string
  endAt: string
}

export interface OverrideShiftInstancePayload {
  startAt?: string
  endAt?: string
  status?: ShiftInstanceStatus
}

export interface CreateShiftAssignmentPayload {
  employeeMembershipId: string
  shiftInstanceId: string
}

export interface MyShift {
  assignmentId: string
  employeeMembershipId: string
  shiftInstanceId: string
  assignmentStatus: ShiftAssignmentStatus
  assignedAt: string
  shift: ShiftInstance
}

export interface CreateShiftPatternAssignmentPayload {
  employeeMembershipId: string
  shiftPatternId: string
  effectiveFrom?: string
  effectiveUntil?: string
}

export interface UpdateShiftPatternAssignmentPayload {
  employeeMembershipId?: string
  shiftPatternId?: string
  effectiveFrom?: string
  effectiveUntil?: string
  status?: ShiftAssignmentStatus
}

export interface ShiftInstanceQueryParams extends PaginationParams {
  from?: string
  to?: string
  patternId?: string
}

export const schedulingApi = {
  patterns(params?: PaginationParams): Promise<PaginatedResult<ShiftPattern>> {
    return apiRequest<PaginatedResult<ShiftPattern>>(`/shift-patterns${toQueryString({ ...params })}`)
  },

  createPattern(body: CreateShiftPatternPayload): Promise<ShiftPattern> {
    return apiRequest<ShiftPattern>('/shift-patterns', { method: 'POST', body })
  },

  updatePattern(id: string, body: UpdateShiftPatternPayload): Promise<ShiftPattern> {
    return apiRequest<ShiftPattern>(`/shift-patterns/${id}`, { method: 'PATCH', body })
  },

  archivePattern(id: string): Promise<ShiftPattern> {
    return apiRequest<ShiftPattern>(`/shift-patterns/${id}`, { method: 'DELETE' })
  },

  instances(params?: ShiftInstanceQueryParams): Promise<PaginatedResult<ShiftInstance>> {
    return apiRequest<PaginatedResult<ShiftInstance>>(`/shift-instances${toQueryString({ ...params })}`)
  },

  myShifts(params?: ShiftInstanceQueryParams): Promise<PaginatedResult<MyShift>> {
    return apiRequest<PaginatedResult<MyShift>>(`/me/shifts${toQueryString({ ...params })}`)
  },

  createInstance(body: CreateShiftInstancePayload): Promise<ShiftInstance> {
    return apiRequest<ShiftInstance>('/shift-instances', { method: 'POST', body })
  },

  overrideInstance(id: string, body: OverrideShiftInstancePayload): Promise<ShiftInstance> {
    return apiRequest<ShiftInstance>(`/shift-instances/${id}`, { method: 'PATCH', body })
  },

  cancelInstance(id: string): Promise<ShiftInstance> {
    return apiRequest<ShiftInstance>(`/shift-instances/${id}/cancel`, { method: 'POST' })
  },

  assignments(params?: PaginationParams): Promise<PaginatedResult<ShiftAssignment>> {
    return apiRequest<PaginatedResult<ShiftAssignment>>(`/shift-assignments${toQueryString({ ...params })}`)
  },

  /** Legacy/internal: retained for historical instance-level assignment records only. */
  createAssignment(body: CreateShiftAssignmentPayload): Promise<ShiftAssignment> {
    return apiRequest<ShiftAssignment>('/shift-assignments', { method: 'POST', body })
  },

  patternAssignments(params?: PaginationParams): Promise<PaginatedResult<ShiftPatternAssignment>> {
    return apiRequest<PaginatedResult<ShiftPatternAssignment>>(`/shift-pattern-assignments${toQueryString({ ...params })}`)
  },

  createPatternAssignment(body: CreateShiftPatternAssignmentPayload): Promise<ShiftPatternAssignment> {
    return apiRequest<ShiftPatternAssignment>('/shift-pattern-assignments', { method: 'POST', body })
  },

  updatePatternAssignment(id: string, body: UpdateShiftPatternAssignmentPayload): Promise<ShiftPatternAssignment> {
    return apiRequest<ShiftPatternAssignment>(`/shift-pattern-assignments/${id}`, { method: 'PATCH', body })
  },

  cancelPatternAssignment(id: string): Promise<ShiftPatternAssignment> {
    return apiRequest<ShiftPatternAssignment>(`/shift-pattern-assignments/${id}/cancel`, { method: 'POST' })
  },
}
