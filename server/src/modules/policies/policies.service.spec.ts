import { DEFAULT_POLICY_RULES, PoliciesService } from './policies.service';

describe('PoliciesService policyResult', () => {
  it('does not require photos under the default policy', async () => {
    const assignments = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new PoliciesService({} as never, assignments as never, {} as never);

    const result = await service.effectivePolicy('organization-id', 'membership-id');

    expect(result.policy).toBeNull();
    expect(result.rules.requireClockInPhoto).toBe(false);
    expect(result.rules.requireClockOutPhoto).toBe(false);
  });

  it('flags unplanned clock-ins under the default policy', () => {
    const service = Object.create(PoliciesService.prototype) as PoliciesService;
    const result = service.policyResult(DEFAULT_POLICY_RULES, { hasShift: false });

    expect(result.allowed).toBe(true);
    expect(result.requiresReview).toBe(false);
    expect(result.exceptions).toEqual([
      {
        code: 'UNPLANNED_CLOCK_IN',
        severity: 'WARNING',
        message: 'Clock-in did not match an assigned shift.'
      }
    ]);
  });
});
