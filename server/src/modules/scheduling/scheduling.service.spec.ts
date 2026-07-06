import { MembershipStatus } from '../organizations/entities/organization-membership.entity';
import { RequestUser } from '../../common/types/authenticated-request';
import { SchedulingService } from './scheduling.service';
import { ShiftInstance, ShiftInstanceStatus } from './entities/shift-instance.entity';
import { ShiftPattern, ShiftPatternFreq } from './entities/shift-pattern.entity';
import { ShiftPatternAssignment, ShiftPatternAssignmentStatus } from './entities/shift-pattern-assignment.entity';

const orgId = '00000000-0000-0000-0000-000000000001';
const employeeId = '11111111-1111-1111-1111-111111111111';
const otherEmployeeId = '22222222-2222-2222-2222-222222222222';
const patternAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const patternBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const user = {
  organizationId: orgId,
  membershipId: employeeId
} as RequestUser;

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
  permissions: ['scheduling.manage']
};

function makePattern(id: string, name: string): ShiftPattern {
  return { id, organizationId: orgId, name } as ShiftPattern;
}

function makeAssignment(patternId: string, membershipId = employeeId): ShiftPatternAssignment {
  return {
    id: `${patternId}-${membershipId}`,
    organizationId: orgId,
    employeeMembershipId: membershipId,
    shiftPatternId: patternId,
    status: ShiftPatternAssignmentStatus.ACTIVE
  } as ShiftPatternAssignment;
}

function makeInstance(id: string, patternId: string, shiftDate: string, status = ShiftInstanceStatus.SCHEDULED): ShiftInstance {
  return {
    id,
    organizationId: orgId,
    patternId,
    shiftDate,
    startAt: new Date(`${shiftDate}T09:00:00.000Z`),
    endAt: new Date(`${shiftDate}T17:00:00.000Z`),
    status
  } as ShiftInstance;
}

function makeService(patternAssignments: ShiftPatternAssignment[], patterns: ShiftPattern[], instances: ShiftInstance[]) {
  const patternRepo = {
    find: jest.fn(async ({ where }) => patterns.filter((pattern) => where.id._value.includes(pattern.id)))
  };
  const instanceRepo = {
    find: jest.fn(async ({ where }) =>
      instances.filter(
        (instance) =>
          instance.organizationId === where.organizationId &&
          where.patternId._value.includes(instance.patternId) &&
          instance.shiftDate >= where.shiftDate._value[0] &&
          instance.shiftDate <= where.shiftDate._value[1] &&
          where.status._value.includes(instance.status)
      )
    )
  };
  const assignmentRepo = {};
  const patternAssignmentRepo = {
    find: jest.fn(async ({ where }) =>
      patternAssignments.filter(
        (assignment) =>
          assignment.organizationId === where.organizationId &&
          assignment.employeeMembershipId === where.employeeMembershipId &&
          assignment.status === where.status
      )
    )
  };
  const membershipRepo = {
    findOne: jest.fn()
  };

  const service = new SchedulingService(
    patternRepo as never,
    instanceRepo as never,
    assignmentRepo as never,
    patternAssignmentRepo as never,
    membershipRepo as never
  );
  return { service, patternRepo, instanceRepo, patternAssignmentRepo };
}

function createHarness() {
  let instanceCounter = 0;
  const patterns: ShiftPattern[] = [];
  const instances: ShiftInstance[] = [];

  const patternsRepo = {
    findOne: jest.fn(async ({ where }: { where: { id: string; organizationId: string } }) =>
      patterns.find((item) => item.id === where.id && item.organizationId === where.organizationId) ?? null
    ),
    save: jest.fn(async (entity: ShiftPattern) => entity),
    find: jest.fn()
  };

  const instancesRepo = {
    create: jest.fn((data: Partial<ShiftInstance>) => ({
      id: `instance-${++instanceCounter}`,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      version: 1,
      createdById: null,
      lastUpdatedById: null,
      ...data
    })),
    save: jest.fn(async (entities: ShiftInstance | ShiftInstance[]) => {
      const list = Array.isArray(entities) ? entities : [entities];
      for (const entity of list) {
        const index = instances.findIndex((item) => item.id === entity.id);
        if (index >= 0) instances[index] = entity;
        else instances.push(entity);
      }
      return entities;
    }),
    find: jest.fn(async ({ where }: { where: { organizationId: string; patternId: string; status: ShiftInstanceStatus; startAt: { _value: Date } } }) =>
      instances.filter(
        (item) =>
          item.organizationId === where.organizationId &&
          item.patternId === where.patternId &&
          item.status === where.status &&
          item.startAt > where.startAt._value
      )
    ),
    createQueryBuilder: jest.fn()
  };

  const service = new SchedulingService(
    patternsRepo as never,
    instancesRepo as never,
    {} as never,
    { find: jest.fn() } as never,
    { findOne: jest.fn() } as never
  );

  const addPattern = (overrides: Partial<ShiftPattern> = {}) => {
    const pattern = {
      id: 'pattern-1',
      organizationId: actor.organizationId,
      name: 'Weekday day shift',
      timezone: 'America/Chicago',
      startTime: '09:00',
      endTime: '17:00',
      workSiteId: 'site-a',
      rrule: null,
      freq: ShiftPatternFreq.WEEKLY,
      daysOfWeek: [1, 3],
      effectiveFrom: '2026-07-06',
      effectiveUntil: null,
      active: true,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      version: 1,
      createdById: null,
      lastUpdatedById: null,
      ...overrides
    } as ShiftPattern;
    patterns.push(pattern);
    return pattern;
  };

  const addInstance = (overrides: Partial<ShiftInstance>) => {
    const instance = instancesRepo.create({
      organizationId: actor.organizationId,
      patternId: 'pattern-1',
      workSiteId: 'site-a',
      shiftDate: '2026-07-06',
      startAt: new Date('2026-07-06T14:00:00.000Z'),
      endAt: new Date('2026-07-06T22:00:00.000Z'),
      status: ShiftInstanceStatus.SCHEDULED,
      ...overrides
    }) as ShiftInstance;
    instances.push(instance);
    return instance;
  };

  return { service, patternsRepo, instancesRepo, patterns, instances, addPattern, addInstance };
}

describe('SchedulingService.findMyShifts', () => {
  const query = { from: '2026-07-01', to: '2026-07-31' };

  it('returns instances for an employee assigned to one pattern with the pattern name', async () => {
    const { service } = makeService(
      [makeAssignment(patternAId)],
      [makePattern(patternAId, 'Morning care')],
      [makeInstance('shift-1', patternAId, '2026-07-06')]
    );

    await expect(service.findMyShifts(user, query)).resolves.toMatchObject([
      { id: 'shift-1', patternId: patternAId, patternName: 'Morning care' }
    ]);
  });

  it('returns instances for an employee assigned to multiple patterns', async () => {
    const { service } = makeService(
      [makeAssignment(patternAId), makeAssignment(patternBId)],
      [makePattern(patternAId, 'Morning care'), makePattern(patternBId, 'Evening care')],
      [makeInstance('shift-1', patternAId, '2026-07-06'), makeInstance('shift-2', patternBId, '2026-07-07')]
    );

    await expect(service.findMyShifts(user, query)).resolves.toMatchObject([
      { id: 'shift-1', patternName: 'Morning care' },
      { id: 'shift-2', patternName: 'Evening care' }
    ]);
  });

  it('does not return shifts for other employees assigned to the same pattern', async () => {
    const { service } = makeService(
      [makeAssignment(patternAId, otherEmployeeId)],
      [makePattern(patternAId, 'Morning care')],
      [makeInstance('shift-1', patternAId, '2026-07-06')]
    );

    await expect(service.findMyShifts(user, query)).resolves.toEqual([]);
  });

  it('hides cancelled and completed instances by default', async () => {
    const { service } = makeService(
      [makeAssignment(patternAId)],
      [makePattern(patternAId, 'Morning care')],
      [
        makeInstance('scheduled', patternAId, '2026-07-06'),
        makeInstance('cancelled', patternAId, '2026-07-07', ShiftInstanceStatus.CANCELLED),
        makeInstance('completed', patternAId, '2026-07-08', ShiftInstanceStatus.COMPLETED)
      ]
    );

    await expect(service.findMyShifts(user, query)).resolves.toMatchObject([{ id: 'scheduled' }]);
  });

  it('includes modified instances', async () => {
    const { service } = makeService(
      [makeAssignment(patternAId)],
      [makePattern(patternAId, 'Morning care')],
      [makeInstance('modified', patternAId, '2026-07-06', ShiftInstanceStatus.MODIFIED)]
    );

    await expect(service.findMyShifts(user, query)).resolves.toMatchObject([
      { id: 'modified', status: ShiftInstanceStatus.MODIFIED, patternName: 'Morning care' }
    ]);
  });
});

describe('SchedulingService pattern updates', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-05T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('recomputes future scheduled instance times and work sites without touching modified or started instances', async () => {
    const harness = createHarness();
    harness.addPattern();
    const future = harness.addInstance({ shiftDate: '2026-07-06' });
    const started = harness.addInstance({
      shiftDate: '2026-07-05',
      startAt: new Date('2026-07-05T11:00:00.000Z'),
      endAt: new Date('2026-07-05T19:00:00.000Z')
    });
    const modified = harness.addInstance({
      shiftDate: '2026-07-08',
      status: ShiftInstanceStatus.MODIFIED,
      startAt: new Date('2026-07-08T16:00:00.000Z')
    });
    const completed = harness.addInstance({
      shiftDate: '2026-07-13',
      status: ShiftInstanceStatus.COMPLETED,
      startAt: new Date('2026-07-13T14:00:00.000Z'),
      endAt: new Date('2026-07-13T22:00:00.000Z')
    });

    await harness.service.updatePattern(actor, 'pattern-1', {
      startTime: '10:30',
      endTime: '18:45',
      workSiteId: 'site-b'
    });

    expect(future.startAt.toISOString()).toBe('2026-07-06T15:30:00.000Z');
    expect(future.endAt.toISOString()).toBe('2026-07-06T23:45:00.000Z');
    expect(future.workSiteId).toBe('site-b');
    expect(started.startAt.toISOString()).toBe('2026-07-05T11:00:00.000Z');
    expect(modified.startAt.toISOString()).toBe('2026-07-08T16:00:00.000Z');
    expect(completed.status).toBe(ShiftInstanceStatus.COMPLETED);
    expect(completed.startAt.toISOString()).toBe('2026-07-13T14:00:00.000Z');
  });

  it('creates newly expected dates and cancels future scheduled dates removed by day changes', async () => {
    const harness = createHarness();
    harness.addPattern();
    const monday = harness.addInstance({ shiftDate: '2026-07-06' });

    await harness.service.updatePattern(actor, 'pattern-1', { daysOfWeek: [2] });

    expect(monday.status).toBe(ShiftInstanceStatus.CANCELLED);
    const tuesday = harness.instances.find((item) => item.shiftDate === '2026-07-07');
    expect(tuesday?.status).toBe(ShiftInstanceStatus.SCHEDULED);
    expect(tuesday?.startAt.toISOString()).toBe('2026-07-07T14:00:00.000Z');
  });

  it('cancels dates before a later effective date and creates dates inside the new horizon', async () => {
    const harness = createHarness();
    harness.addPattern();
    const oldMonday = harness.addInstance({ shiftDate: '2026-07-06' });

    await harness.service.updatePattern(actor, 'pattern-1', { effectiveFrom: '2026-07-13' });

    expect(oldMonday.status).toBe(ShiftInstanceStatus.CANCELLED);
    const newMonday = harness.instances.find((item) => item.shiftDate === '2026-07-13');
    expect(newMonday?.status).toBe(ShiftInstanceStatus.SCHEDULED);
  });

  it('cancels future scheduled instances after a shortened end date', async () => {
    const harness = createHarness();
    harness.addPattern();
    const withinEnd = harness.addInstance({ shiftDate: '2026-07-06' });
    const afterEnd = harness.addInstance({ shiftDate: '2026-07-13', startAt: new Date('2026-07-13T14:00:00.000Z') });

    await harness.service.updatePattern(actor, 'pattern-1', { effectiveUntil: '2026-07-06' });

    expect(withinEnd.status).toBe(ShiftInstanceStatus.SCHEDULED);
    expect(afterEnd.status).toBe(ShiftInstanceStatus.CANCELLED);
  });
});
