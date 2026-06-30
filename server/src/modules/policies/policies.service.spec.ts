import { DEFAULT_POLICY_RULES, PoliciesService } from './policies.service';

describe('PoliciesService policyResult', () => {
  it('flags unplanned clock-ins under the MVP default policy', () => {
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
