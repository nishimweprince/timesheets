import { NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '../organizations/entities/organization-membership.entity';
import { RequestUser } from '../../common/types/authenticated-request';
import { PolicyAssignmentScope } from './entities/attendance-policy-assignment.entity';
import { AttendancePolicy, PolicyEnforcement } from './entities/attendance-policy.entity';
import { AttendancePolicyAssignment } from './entities/attendance-policy-assignment.entity';
import { WorkSite } from './entities/work-site.entity';
import { DEFAULT_POLICY_RULES, PoliciesService } from './policies.service';

const actor: RequestUser = {
  userId: 'user-admin',
  membershipId: 'membership-admin',
  organizationId: 'organization-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  fullName: 'Admin User',
  membershipStatus: MembershipStatus.ACTIVE,
  primaryWorkSiteId: null,
  roleNames: ['Organization Admin'],
  permissions: ['policy.read', 'policy.manage']
};

function createHarness() {
  const policies: AttendancePolicy[] = [];
  const assignments: AttendancePolicyAssignment[] = [];
  const workSites: WorkSite[] = [];
  let policyCounter = 0;
  let assignmentCounter = 0;
  let workSiteCounter = 0;

  const policiesRepo = {
    create: jest.fn((data: Partial<AttendancePolicy>) => ({
      id: `policy-${++policyCounter}`,
      organizationId: data.organizationId!,
      name: data.name!,
      active: true,
      rules: data.rules!,
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
      version: 1,
      createdById: null,
      lastUpdatedById: null
    })),
    save: jest.fn(async (entity: AttendancePolicy) => {
      policies.push(entity);
      return entity;
    }),
    find: jest.fn(async ({ where, order }: { where: { organizationId: string }; order: { createdAt: string } }) =>
      [...policies]
        .filter((item) => item.organizationId === where.organizationId)
        .sort((left, right) => (order.createdAt === 'DESC' ? right.createdAt.getTime() - left.createdAt.getTime() : 0))
    ),
    findOne: jest.fn(async ({ where }: { where: { id: string; organizationId: string; active?: boolean } }) =>
      policies.find(
        (item) =>
          item.id === where.id &&
          item.organizationId === where.organizationId &&
          (where.active === undefined || item.active === where.active)
      ) ?? null
    )
  };

  const assignmentsRepo = {
    create: jest.fn((data: Partial<AttendancePolicyAssignment>) => ({
      id: `assignment-${++assignmentCounter}`,
      organizationId: data.organizationId!,
      policyId: data.policyId!,
      scope: data.scope!,
      scopeId: data.scopeId ?? null,
      active: true,
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
      version: 1,
      createdById: null,
      lastUpdatedById: null
    })),
    save: jest.fn(async (entity: AttendancePolicyAssignment) => {
      assignments.push(entity);
      return entity;
    }),
    find: jest.fn(
      async ({ where, order }: { where: { organizationId: string; active?: boolean }; order: { createdAt: string } }) =>
        [...assignments]
          .filter(
            (item) =>
              item.organizationId === where.organizationId &&
              (where.active === undefined || item.active === where.active)
          )
          .sort((left, right) =>
            order.createdAt === 'DESC' ? right.createdAt.getTime() - left.createdAt.getTime() : 0
          )
    ),
    findOne: jest.fn(
      async ({
        where
      }: {
        where: {
          organizationId: string;
          scope?: PolicyAssignmentScope;
          scopeId?: string | null;
          active?: boolean;
        };
      }) =>
        assignments.find(
          (item) =>
            item.organizationId === where.organizationId &&
            (where.scope === undefined || item.scope === where.scope) &&
            (where.scopeId === undefined || item.scopeId === where.scopeId) &&
            (where.active === undefined || item.active === where.active)
        ) ?? null
    )
  };

  const workSitesRepo = {
    create: jest.fn((data: Partial<WorkSite>) => ({
      id: `work-site-${++workSiteCounter}`,
      organizationId: data.organizationId!,
      name: data.name!,
      timezone: data.timezone ?? 'America/Chicago',
      locationPoint: null,
      active: true,
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
      version: 1,
      createdById: null,
      lastUpdatedById: null
    })),
    save: jest.fn(async (entity: WorkSite) => {
      workSites.push(entity);
      return entity;
    }),
    find: jest.fn(
      async ({ where, order }: { where: { organizationId: string; active?: boolean }; order: { name: string } }) =>
        [...workSites]
          .filter(
            (item) =>
              item.organizationId === where.organizationId &&
              (where.active === undefined || item.active === where.active)
          )
          .sort((left, right) => (order.name === 'ASC' ? left.name.localeCompare(right.name) : 0))
    )
  };

  const service = new PoliciesService(
    policiesRepo as never,
    assignmentsRepo as never,
    workSitesRepo as never
  );

  return { service, policies, assignments, workSites };
}

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

describe('PoliciesService org-scoped persistence', () => {
  it('creates, lists, assigns, and lists work sites for the organization', async () => {
    const { service, policies, assignments, workSites } = createHarness();

    const createdPolicy = await service.createPolicy(actor, {
      name: 'Clinical strict',
      rules: {
        ...DEFAULT_POLICY_RULES,
        requireClockInPhoto: true,
        unplannedClockIn: PolicyEnforcement.BLOCK
      }
    });

    expect(createdPolicy.organizationId).toBe(actor.organizationId);
    expect(createdPolicy.name).toBe('Clinical strict');
    expect(policies).toHaveLength(1);

    const listedPolicies = await service.findPolicies(actor);
    expect(listedPolicies).toHaveLength(1);
    expect(listedPolicies[0].id).toBe(createdPolicy.id);

    const assignment = await service.assignPolicy(actor, {
      policyId: createdPolicy.id,
      scope: PolicyAssignmentScope.ORGANIZATION
    });

    expect(assignment.policyId).toBe(createdPolicy.id);
    expect(assignment.scope).toBe(PolicyAssignmentScope.ORGANIZATION);
    expect(assignments).toHaveLength(1);

    const listedAssignments = await service.findAssignments(actor);
    expect(listedAssignments).toHaveLength(1);
    expect(listedAssignments[0].id).toBe(assignment.id);

    const workSite = await service.createWorkSite(actor, {
      name: 'Main clinic',
      timezone: 'America/Chicago'
    });

    expect(workSite.name).toBe('Main clinic');
    expect(workSites).toHaveLength(1);

    const listedWorkSites = await service.findWorkSites(actor);
    expect(listedWorkSites).toHaveLength(1);
    expect(listedWorkSites[0].id).toBe(workSite.id);
  });

  it('rejects assignment when the policy does not exist in the organization', async () => {
    const { service } = createHarness();

    await expect(
      service.assignPolicy(actor, {
        policyId: 'missing-policy',
        scope: PolicyAssignmentScope.ORGANIZATION
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});