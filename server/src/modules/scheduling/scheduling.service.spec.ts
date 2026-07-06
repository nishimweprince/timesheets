import { SchedulingService } from './scheduling.service';
import { ShiftInstance, ShiftInstanceStatus } from './entities/shift-instance.entity';
import { ShiftPattern } from './entities/shift-pattern.entity';
import { ShiftPatternAssignment, ShiftPatternAssignmentStatus } from './entities/shift-pattern-assignment.entity';
import { RequestUser } from '../../common/types/authenticated-request';

const orgId = '00000000-0000-0000-0000-000000000001';
const employeeId = '11111111-1111-1111-1111-111111111111';
const otherEmployeeId = '22222222-2222-2222-2222-222222222222';
const patternAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const patternBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const user = {
  organizationId: orgId,
  membershipId: employeeId
} as RequestUser;

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

  const service = new SchedulingService(
    patternRepo as never,
    instanceRepo as never,
    assignmentRepo as never,
    patternAssignmentRepo as never
  );
  return { service, patternRepo, instanceRepo, patternAssignmentRepo };
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
