import { apiRequest } from './client'
import { toQueryString, type PaginatedResult, type PaginationParams } from './pagination'

export const MembershipStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type MembershipStatus = typeof MembershipStatus[keyof typeof MembershipStatus]

export type EmployeeTeam = {
  id: string
  name: string
}

export type EmployeeInvitationState = {
  status: 'pending' | 'accepted' | 'expired' | null
  expiresAt: string | null
}

export type Employee = {
  membershipId: string
  userId: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  status: MembershipStatus
  employeeNumber: string | null
  jobTitle: string | null
  managerMembershipId: string | null
  primaryWorkSiteId: string | null
  roleName: string | null
  teams: EmployeeTeam[]
  invitation: EmployeeInvitationState
  createdAt: string
  updatedAt: string
}

export type Team = {
  id: string
  organizationId: string
  name: string
  managerMembershipId: string | null
  memberCount: number
  createdAt: string
  updatedAt: string
}

export type InviteEmployeePayload = {
  email: string
  firstName: string
  lastName: string
  employeeNumber?: string
  jobTitle?: string
  managerMembershipId?: string
  teamIds?: string[]
  roleName?: string
}

export type UpdateEmployeePayload = {
  firstName?: string
  lastName?: string
  employeeNumber?: string | null
  jobTitle?: string | null
  managerMembershipId?: string | null
  status?: MembershipStatus
  teamIds?: string[]
  roleName?: string
}

export type CreateTeamPayload = {
  name: string
  managerMembershipId?: string | null
}

export type UpdateTeamPayload = {
  name?: string
  managerMembershipId?: string | null
}

export type InvitationPreview = {
  email: string
  firstName: string
  lastName: string
  organizationName: string
  expiresAt: string
}

export type AcceptInvitationPayload = {
  token: string
  password: string
  firstName: string
  lastName: string
}

export interface EmployeesQueryParams extends PaginationParams {
  search?: string
  status?: MembershipStatus
}

export const employeeManagementApi = {
  employees(params?: EmployeesQueryParams): Promise<PaginatedResult<Employee>> {
    return apiRequest<PaginatedResult<Employee>>(`/employees${toQueryString({ ...params })}`)
  },

  inviteEmployee(body: InviteEmployeePayload): Promise<Employee> {
    return apiRequest<Employee>('/employees/invite', { method: 'POST', body })
  },

  updateEmployee(membershipId: string, body: UpdateEmployeePayload): Promise<Employee> {
    return apiRequest<Employee>(`/employees/${membershipId}`, { method: 'PATCH', body })
  },

  resendInvitation(membershipId: string): Promise<Employee> {
    return apiRequest<Employee>(`/employees/${membershipId}/resend-invite`, { method: 'POST' })
  },

  teams(params?: PaginationParams): Promise<PaginatedResult<Team>> {
    return apiRequest<PaginatedResult<Team>>(`/teams${toQueryString({ ...params })}`)
  },

  createTeam(body: CreateTeamPayload): Promise<Team> {
    return apiRequest<Team>('/teams', { method: 'POST', body })
  },

  updateTeam(teamId: string, body: UpdateTeamPayload): Promise<Team> {
    return apiRequest<Team>(`/teams/${teamId}`, { method: 'PATCH', body })
  },

  previewInvitation(token: string): Promise<InvitationPreview> {
    return apiRequest<InvitationPreview>(`/employee-invitations/preview?token=${encodeURIComponent(token)}`)
  },

  acceptInvitation(body: AcceptInvitationPayload): Promise<{ success: true }> {
    return apiRequest<{ success: true }>('/employee-invitations/accept', { method: 'POST', body })
  },
}
