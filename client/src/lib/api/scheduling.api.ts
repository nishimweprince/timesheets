import { apiRequest } from './client'

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

export enum ShiftInstanceStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
}

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

export enum ShiftAssignmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  REASSIGNED = 'REASSIGNED',
}

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
  templates(): Promise<ShiftTemplate[]> {
    return apiRequest<ShiftTemplate[]>('/shift-templates')
  },

  createTemplate(body: CreateShiftTemplatePayload): Promise<ShiftTemplate> {
    return apiRequest<ShiftTemplate>('/shift-templates', { method: 'POST', body })
  },

  instances(): Promise<ShiftInstance[]> {
    return apiRequest<ShiftInstance[]>('/shift-instances')
  },

  createInstance(body: CreateShiftInstancePayload): Promise<ShiftInstance> {
    return apiRequest<ShiftInstance>('/shift-instances', { method: 'POST', body })
  },

  assignments(): Promise<ShiftAssignment[]> {
    return apiRequest<ShiftAssignment[]>('/shift-assignments')
  },

  createAssignment(body: CreateShiftAssignmentPayload): Promise<ShiftAssignment> {
    return apiRequest<ShiftAssignment>('/shift-assignments', { method: 'POST', body })
  },
}
