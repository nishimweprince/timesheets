import { describe, expect, it } from 'vitest'
import {
  PolicyAssignmentScope,
  DEFAULT_POLICY_RULES,
} from '@/lib/api/policies.api'
import {
  validateAssignPolicyPayload,
  validateCreatePolicyPayload,
  validateCreateWorkSitePayload,
  validatePolicyName,
  validateUpdatePolicyPayload,
} from './policies-validation'

describe('policies-validation (shipped form guards)', () => {
  it('rejects blank policy names before submit', () => {
    expect(validatePolicyName('   ')).toBe('Policy name is required')
    expect(validateCreatePolicyPayload({ name: ' ', rules: DEFAULT_POLICY_RULES })).toBe(
      'Policy name is required',
    )
    expect(
      validateUpdatePolicyPayload({ name: ' ', rules: DEFAULT_POLICY_RULES, active: true }),
    ).toBe('Policy name is required')
  })

  it('rejects blank work site names before submit', () => {
    expect(validateCreateWorkSitePayload({ name: '' })).toBe('Work site name is required')
  })

  it('blocks employee assignment without directory access', () => {
    expect(
      validateAssignPolicyPayload(
        {
          policyId: 'policy-1',
          scope: PolicyAssignmentScope.EMPLOYEE,
          scopeId: 'membership-1',
        },
        { canAssignEmployees: false },
      ),
    ).toBe('Employee assignment requires employee directory access')
  })

  it('requires an employee when assigning to employee scope', () => {
    expect(
      validateAssignPolicyPayload(
        {
          policyId: 'policy-1',
          scope: PolicyAssignmentScope.EMPLOYEE,
        },
        { canAssignEmployees: true },
      ),
    ).toBe('Select an employee for this assignment')
  })
})