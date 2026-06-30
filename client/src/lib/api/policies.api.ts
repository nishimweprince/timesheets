import { apiRequest } from './client'
import { paginateList } from './paginate-list'
import type { PaginatedResult, PaginationParams } from './pagination'

export { paginateList } from './paginate-list'

export const PolicyEnforcement = {
  ALLOW: 'ALLOW',
  FLAG: 'FLAG',
  REQUIRE_REASON: 'REQUIRE_REASON',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
  BLOCK: 'BLOCK',
} as const

export type PolicyEnforcement = typeof PolicyEnforcement[keyof typeof PolicyEnforcement]

export const PolicyAssignmentScope = {
  ORGANIZATION: 'ORGANIZATION',
  WORK_SITE: 'WORK_SITE',
  TEAM: 'TEAM',
  SHIFT_TEMPLATE: 'SHIFT_TEMPLATE',
  EMPLOYEE: 'EMPLOYEE',
} as const

export type PolicyAssignmentScope = typeof PolicyAssignmentScope[keyof typeof PolicyAssignmentScope]

export type AttendancePolicyRules = {
  requireClockInPhoto: boolean
  requireClockOutPhoto: boolean
  requireLocation: boolean
  unplannedClockIn: PolicyEnforcement
  outsideGeofence: PolicyEnforcement
  earlyClockInGraceMinutes: number
  lateClockInGraceMinutes: number
  maxShiftMinutes: number
}

export type AttendancePolicy = {
  id: string
  organizationId: string
  name: string
  active: boolean
  rules: AttendancePolicyRules
  createdAt: string
  updatedAt: string
}

export type AttendancePolicyAssignment = {
  id: string
  organizationId: string
  policyId: string
  scope: PolicyAssignmentScope
  scopeId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type WorkSite = {
  id: string
  organizationId: string
  name: string
  timezone: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CreatePolicyPayload = {
  name: string
  rules: AttendancePolicyRules
}

export type CreatePolicyAssignmentPayload = {
  policyId: string
  scope: PolicyAssignmentScope
  scopeId?: string
}

export type CreateWorkSitePayload = {
  name: string
  timezone?: string
}

export const DEFAULT_POLICY_RULES: AttendancePolicyRules = {
  requireClockInPhoto: false,
  requireClockOutPhoto: false,
  requireLocation: false,
  unplannedClockIn: PolicyEnforcement.FLAG,
  outsideGeofence: PolicyEnforcement.FLAG,
  earlyClockInGraceMinutes: 15,
  lateClockInGraceMinutes: 5,
  maxShiftMinutes: 16 * 60,
}

export const policiesApi = {
  policies(): Promise<AttendancePolicy[]> {
    return apiRequest<AttendancePolicy[]>('/attendance-policies')
  },

  async policiesPage(params?: PaginationParams): Promise<PaginatedResult<AttendancePolicy>> {
    const items = await apiRequest<AttendancePolicy[]>('/attendance-policies')
    return paginateList(items, params)
  },

  createPolicy(body: CreatePolicyPayload): Promise<AttendancePolicy> {
    return apiRequest<AttendancePolicy>('/attendance-policies', { method: 'POST', body })
  },

  assignments(): Promise<AttendancePolicyAssignment[]> {
    return apiRequest<AttendancePolicyAssignment[]>('/attendance-policies/assignments')
  },

  async assignmentsPage(params?: PaginationParams): Promise<PaginatedResult<AttendancePolicyAssignment>> {
    const items = await apiRequest<AttendancePolicyAssignment[]>('/attendance-policies/assignments')
    return paginateList(items, params)
  },

  assignPolicy(body: CreatePolicyAssignmentPayload): Promise<AttendancePolicyAssignment> {
    return apiRequest<AttendancePolicyAssignment>('/attendance-policies/assignments', {
      method: 'POST',
      body,
    })
  },

  workSites(): Promise<WorkSite[]> {
    return apiRequest<WorkSite[]>('/work-sites')
  },

  async workSitesPage(params?: PaginationParams): Promise<PaginatedResult<WorkSite>> {
    const items = await apiRequest<WorkSite[]>('/work-sites')
    return paginateList(items, params)
  },

  createWorkSite(body: CreateWorkSitePayload): Promise<WorkSite> {
    return apiRequest<WorkSite>('/work-sites', { method: 'POST', body })
  },
}