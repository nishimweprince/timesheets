import * as bcrypt from 'bcryptjs';
import { OrganizationsService } from './organizations.service';
import { EmployeeInvitation } from './entities/employee-invitation.entity';
import { EmployeeProfile } from './entities/employee-profile.entity';
import { OrganizationMembership, MembershipStatus } from './entities/organization-membership.entity';
import { Organization } from './entities/organization.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { Team } from './entities/team.entity';
import { User } from './entities/user.entity';
import { Role } from '../authorization/entities/role.entity';
import { MembershipRole } from '../authorization/entities/membership-role.entity';
import { RequestUser } from '../../common/types/authenticated-request';

describe('OrganizationsService employee invitations', () => {
  const actor: RequestUser = {
    userId: 'user-admin',
    membershipId: 'membership-admin',
    organizationId: 'organization-1',
    email: 'admin@example.com',
    permissions: []
  };

  it('invites an employee with a pending membership and hashed onboarding token', async () => {
    const harness = createHarness();

    const employee = await harness.service.inviteEmployee(actor, {
      email: 'New.Employee@Example.com',
      firstName: 'New',
      lastName: 'Employee',
      employeeNumber: 'EMP-100',
      jobTitle: 'Nurse',
      roleName: 'Employee',
      teamIds: ['team-1']
    });

    expect(employee.email).toBe('new.employee@example.com');
    expect(employee.status).toBe(MembershipStatus.PENDING);
    expect(employee.employeeNumber).toBe('EMP-100');
    expect(employee.jobTitle).toBe('Nurse');
    expect(employee.roleName).toBe('Employee');
    expect(employee.teams).toEqual([{ id: 'team-1', name: 'Clinical' }]);
    expect(employee.invitation.status).toBe('pending');
    expect(harness.mailService.sendEmployeeInvitation).toHaveBeenCalledTimes(1);

    const invitation = harness.repoFor<EmployeeInvitation>(EmployeeInvitation).items[0];
    const url = harness.mailService.sendEmployeeInvitation.mock.calls[0][1] as string;
    const token = new URL(url).searchParams.get('token');
    expect(token).toBeTruthy();
    expect(invitation.tokenHash).not.toBe(token);
    await expect(bcrypt.compare(token!, invitation.tokenHash)).resolves.toBe(true);
  });

  it('accepts an invitation once and activates the membership', async () => {
    const harness = createHarness();
    const employee = await harness.service.inviteEmployee(actor, {
      email: 'accept@example.com',
      firstName: 'Pending',
      lastName: 'Person'
    });
    const url = harness.mailService.sendEmployeeInvitation.mock.calls[0][1] as string;
    const token = new URL(url).searchParams.get('token')!;

    await expect(
      harness.service.acceptInvitation({
        token,
        firstName: 'Accepted',
        lastName: 'Person',
        password: 'NewPassword123'
      })
    ).resolves.toEqual({ success: true });

    const membership = harness.repoFor<OrganizationMembership>(OrganizationMembership).items.find((item) => item.id === employee.membershipId)!;
    const invitedUser = harness.repoFor<User>(User).items.find((item) => item.email === 'accept@example.com')!;
    const invitation = harness.repoFor<EmployeeInvitation>(EmployeeInvitation).items[0];

    expect(membership.status).toBe(MembershipStatus.ACTIVE);
    expect(invitedUser.firstName).toBe('Accepted');
    await expect(bcrypt.compare('NewPassword123', invitedUser.passwordHash)).resolves.toBe(true);
    expect(invitation.acceptedAt).toBeInstanceOf(Date);

    await expect(
      harness.service.acceptInvitation({
        token,
        firstName: 'Accepted',
        lastName: 'Person',
        password: 'NewPassword123'
      })
    ).rejects.toThrow('Invitation link is invalid or expired');
  });
});

function createHarness() {
  const repos = new Map<unknown, InMemoryRepo<object>>();
  const repo = <T extends object>(entity: unknown, initial: T[] = []) => {
    const inMemoryRepo = new InMemoryRepo<T>(initial);
    repos.set(entity, inMemoryRepo as InMemoryRepo<object>);
    return inMemoryRepo;
  };

  const organizations = repo(Organization, [
    {
      id: 'organization-1',
      name: 'Tuza Health',
      defaultTimezone: 'America/Chicago',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      lastUpdatedById: null
    } as Organization
  ]);
  const users = repo(User, []);
  const memberships = repo(OrganizationMembership, []);
  const profiles = repo(EmployeeProfile, []);
  const teams = repo(Team, [
    {
      id: 'team-1',
      organizationId: 'organization-1',
      name: 'Clinical',
      managerMembershipId: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      lastUpdatedById: null
    } as Team
  ]);
  const teamMemberships = repo(TeamMembership, []);
  const roles = repo(Role, [
    {
      id: 'role-employee',
      organizationId: 'organization-1',
      name: 'Employee',
      description: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      lastUpdatedById: null
    } as Role
  ]);
  const membershipRoles = repo(MembershipRole, []);
  const invitations = repo(EmployeeInvitation, []);

  const manager = {
    getRepository: jest.fn((entity: unknown) => repos.get(entity))
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager))
  };
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'APP_URL') return 'http://localhost:5173';
      throw new Error(`Missing config ${key}`);
    })
  };
  const mailService = {
    sendEmployeeInvitation: jest.fn().mockResolvedValue(undefined)
  };

  const service = new OrganizationsService(
    dataSource as never,
    config as never,
    mailService as never,
    organizations as never,
    users as never,
    memberships as never,
    profiles as never,
    teams as never,
    teamMemberships as never,
    roles as never,
    membershipRoles as never,
    invitations as never
  );

  const repoFor = <T extends object>(entity: unknown) => repos.get(entity) as InMemoryRepo<T>;

  return { service, repos, repoFor, mailService };
}

class InMemoryRepo<T extends object> {
  private nextId = 1;

  constructor(public readonly items: T[]) {}

  create(partial: Partial<T>): T {
    return { ...partial } as T;
  }

  async save(input: T | T[]): Promise<T | T[]> {
    if (Array.isArray(input)) return Promise.all(input.map((item) => this.saveOne(item)));
    return this.saveOne(input);
  }

  async find(options?: { where?: Partial<T>; order?: Record<string, 'ASC' | 'DESC'> }): Promise<T[]> {
    const where = options?.where;
    let results = where ? this.items.filter((item) => matches(item, where)) : [...this.items];
    const order = options?.order;
    if (order) {
      const [key, direction] = Object.entries(order)[0] as [keyof T, 'ASC' | 'DESC'];
      results = [...results].sort((a, b) => {
        const left = a[key] as unknown as Date | string | number;
        const right = b[key] as unknown as Date | string | number;
        const leftValue = left instanceof Date ? left.getTime() : left;
        const rightValue = right instanceof Date ? right.getTime() : right;
        return direction === 'ASC' ? String(leftValue).localeCompare(String(rightValue)) : String(rightValue).localeCompare(String(leftValue));
      });
    }
    return results;
  }

  async findOne(options: { where: Partial<T> }): Promise<T | null> {
    return this.items.find((item) => matches(item, options.where)) ?? null;
  }

  async findOneByOrFail(where: Partial<T>): Promise<T> {
    const item = this.items.find((candidate) => matches(candidate, where));
    if (!item) throw new Error('not found');
    return item;
  }

  async findOneBy(where: Partial<T>): Promise<T | null> {
    return this.items.find((candidate) => matches(candidate, where)) ?? null;
  }

  async delete(where: Partial<T>): Promise<void> {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (matches(this.items[index], where)) this.items.splice(index, 1);
    }
  }

  private async saveOne(item: T): Promise<T> {
    const current = item as Record<string, unknown>;
    if (!current.id) current.id = `generated-${this.nextId++}`;
    if (!current.createdAt) current.createdAt = new Date();
    current.updatedAt = new Date();

    const index = this.items.findIndex((existing) => (existing as Record<string, unknown>).id === current.id);
    if (index >= 0) this.items[index] = item;
    else this.items.push(item);
    return item;
  }
}

function matches<T extends object>(item: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = (item as Record<string, unknown>)[key];
    const operator = expected as { _type?: string; _value?: unknown };
    if (operator && typeof operator === 'object' && operator._type === 'in') {
      return Array.isArray(operator._value) && operator._value.includes(actual);
    }
    if (operator && typeof operator === 'object' && operator._type === 'isNull') {
      return actual === null || actual === undefined;
    }
    return actual === expected;
  });
}
