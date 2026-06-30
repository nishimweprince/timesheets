import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICY_RULES, PolicyEnforcement } from '@/lib/api/policies.api'
import { countActiveRequirements, formatEnforcement, summarizePolicyRules } from './format-rules'

describe('format-rules (shipped policy display helpers)', () => {
  it('formats enforcement enums for table display', () => {
    expect(formatEnforcement(PolicyEnforcement.FLAG)).toBe('Flag')
    expect(formatEnforcement(PolicyEnforcement.BLOCK)).toBe('Block')
  })

  it('summarizes default policy rules without photo requirements', () => {
    const lines = summarizePolicyRules(DEFAULT_POLICY_RULES)

    expect(lines).toContain('Unplanned clock-in: Flag')
    expect(lines).toContain('Outside geofence: Flag')
    expect(countActiveRequirements(DEFAULT_POLICY_RULES)).toBe(0)
  })

  it('counts active capture requirements', () => {
    const rules = {
      ...DEFAULT_POLICY_RULES,
      requireClockInPhoto: true,
      requireLocation: true,
    }

    expect(countActiveRequirements(rules)).toBe(2)
    expect(summarizePolicyRules(rules)).toContain('Clock-in photo required')
    expect(summarizePolicyRules(rules)).toContain('Location required')
  })
})