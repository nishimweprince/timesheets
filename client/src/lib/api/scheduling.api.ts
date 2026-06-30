import { apiRequest } from './client'
import { toQueryString, type PaginatedResult, type PaginationParams } from './pagination'

export interface ShiftTemplate {
  id: string
  organizationId: string
  name: string
  timezone: string
  startTime: string
  endTime: string
  workSiteId: string | null
  active: boolean
  createdAt: string
}

export const ShiftInstanceStatus = {
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
} as const

export type ShiftInstanceStatus = typeof ShiftInstanceStatus[keyof typeof ShiftInstanceStatus]

export interface ShiftInstance {
  id: string
  organizationId: string
  shiftTemplateId: string | null
  workSiteId: string | null
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

export interface CreateShiftTemplatePayload {
  name: string
  startTime: string
  endTime: string
  timezone?: string
  workSiteId?: string
}

export interface CreateShiftInstancePayload {
  shiftTemplateId?: string
  workSiteId?: string
  startAt: string
  endAt: string
}

export interface CreateShiftAssignmentPayload {
  employeeMembershipId: string
  shiftInstanceId: string
}

export const schedulingApi = {
  templates(params?: PaginationParams): Promise<PaginatedResult<ShiftTemplate>> {
    return apiRequest<PaginatedResult<ShiftTemplate>>(`/shift-templates${toQueryString({ ...params })}`)
  },

  createTemplate(body: CreateShiftTemplatePayload): Promise<ShiftTemplate> {
    return apiRequest<ShiftTemplate>('/shift-templates', { method: 'POST', body })
  },

  instances(params?: PaginationParams): Promise<PaginatedResult<ShiftInstance>> {
    return apiRequest<PaginatedResult<ShiftInstance>>(`/shift-instances${toQueryString({ ...params })}`)
  },

  createInstance(body: CreateShiftInstancePayload): Promise<ShiftInstance> {
    return apiRequest<ShiftInstance>('/shift-instances', { method: 'POST', body })
  },

  assignments(params?: PaginationParams): Promise<PaginatedResult<ShiftAssignment>> {
    return apiRequest<PaginatedResult<ShiftAssignment>>(`/shift-assignments${toQueryString({ ...params })}`)
  },

  createAssignment(body: CreateShiftAssignmentPayload): Promise<ShiftAssignment> {
    return apiRequest<ShiftAssignment>('/shift-assignments', { method: 'POST', body })
  },
}
