import {
  PolicyAssignmentScope,
  type CreatePolicyAssignmentPayload,
  type CreatePolicyPayload,
  type CreateWorkSitePayload,
  type UpdatePolicyPayload,
} from '@/lib/api/policies.api'

export function validatePolicyName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Policy name is required'
  if (trimmed.length > 160) return 'Policy name must be 160 characters or fewer'
  return null
}

export function validateWorkSiteName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Work site name is required'
  if (trimmed.length > 160) return 'Work site name must be 160 characters or fewer'
  return null
}

export function validateCreatePolicyPayload(payload: CreatePolicyPayload): string | null {
  return validatePolicyName(payload.name)
}

export function validateUpdatePolicyPayload(payload: UpdatePolicyPayload): string | null {
  return validatePolicyName(payload.name)
}

export function validateCreateWorkSitePayload(payload: CreateWorkSitePayload): string | null {
  return validateWorkSiteName(payload.name)
}

export function validateAssignPolicyPayload(
  payload: CreatePolicyAssignmentPayload,
  options?: { canAssignEmployees?: boolean },
): string | null {
  if (!payload.policyId.trim()) return 'Select a policy to assign'

  if (payload.scope === PolicyAssignmentScope.EMPLOYEE) {
    if (!options?.canAssignEmployees) {
      return 'Employee assignment requires employee directory access'
    }
    if (!payload.scopeId?.trim()) return 'Select an employee for this assignment'
  }

  return null
}