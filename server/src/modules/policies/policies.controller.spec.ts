import { Test } from '@nestjs/testing';
import { MembershipStatus } from '../organizations/entities/organization-membership.entity';
import { RequestUser } from '../../common/types/authenticated-request';
import { PolicyAssignmentScope } from './entities/attendance-policy-assignment.entity';
import { DEFAULT_POLICY_RULES } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

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

describe('PoliciesController', () => {
  const service = {
    findPolicies: jest.fn(),
    createPolicy: jest.fn(),
    findAssignments: jest.fn(),
    assignPolicy: jest.fn(),
    findWorkSites: jest.fn(),
    createWorkSite: jest.fn()
  };

  let controller: PoliciesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [{ provide: PoliciesService, useValue: service }]
    }).compile();

    controller = module.get(PoliciesController);
  });

  it('delegates policy reads and writes to PoliciesService', async () => {
    const policy = {
      id: 'policy-1',
      organizationId: actor.organizationId,
      name: 'Default',
      active: true,
      rules: DEFAULT_POLICY_RULES
    };
    const assignment = {
      id: 'assignment-1',
      organizationId: actor.organizationId,
      policyId: policy.id,
      scope: PolicyAssignmentScope.ORGANIZATION,
      scopeId: null,
      active: true
    };
    const workSite = {
      id: 'work-site-1',
      organizationId: actor.organizationId,
      name: 'Main clinic',
      timezone: 'America/Chicago',
      active: true
    };

    service.findPolicies.mockResolvedValue([policy]);
    service.createPolicy.mockResolvedValue(policy);
    service.findAssignments.mockResolvedValue([assignment]);
    service.assignPolicy.mockResolvedValue(assignment);
    service.findWorkSites.mockResolvedValue([workSite]);
    service.createWorkSite.mockResolvedValue(workSite);

    await expect(controller.findPolicies(actor)).resolves.toEqual([policy]);
    await expect(
      controller.createPolicy(actor, { name: 'Default', rules: DEFAULT_POLICY_RULES })
    ).resolves.toEqual(policy);
    await expect(controller.findAssignments(actor)).resolves.toEqual([assignment]);
    await expect(
      controller.assign(actor, { policyId: policy.id, scope: PolicyAssignmentScope.ORGANIZATION })
    ).resolves.toEqual(assignment);
    await expect(controller.findWorkSites(actor)).resolves.toEqual([workSite]);
    await expect(
      controller.createWorkSite(actor, { name: 'Main clinic', timezone: 'America/Chicago' })
    ).resolves.toEqual(workSite);

    expect(service.findPolicies).toHaveBeenCalledWith(actor);
    expect(service.createPolicy).toHaveBeenCalledWith(actor, {
      name: 'Default',
      rules: DEFAULT_POLICY_RULES
    });
    expect(service.findAssignments).toHaveBeenCalledWith(actor);
    expect(service.assignPolicy).toHaveBeenCalledWith(actor, {
      policyId: policy.id,
      scope: PolicyAssignmentScope.ORGANIZATION
    });
    expect(service.findWorkSites).toHaveBeenCalledWith(actor);
    expect(service.createWorkSite).toHaveBeenCalledWith(actor, {
      name: 'Main clinic',
      timezone: 'America/Chicago'
    });
  });
});