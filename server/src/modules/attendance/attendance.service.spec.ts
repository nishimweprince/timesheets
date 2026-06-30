import { BadRequestException } from '@nestjs/common';
import { AuthenticatedRequest, RequestUser } from '../../common/types/authenticated-request';
import { DEFAULT_POLICY_RULES } from '../policies/policies.service';
import { AttendanceService } from './attendance.service';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { WorkSession, WorkSessionStatus } from './entities/work-session.entity';

describe('AttendanceService location requirements', () => {
  const user: RequestUser = {
    userId: '11111111-1111-1111-1111-111111111111',
    membershipId: '22222222-2222-2222-2222-222222222222',
    organizationId: '33333333-3333-3333-3333-333333333333',
    email: 'employee@example.com',
    permissions: []
  };

  const request = {
    ip: '127.0.0.1',
    correlationId: 'correlation-id',
    header: jest.fn((name: string) => {
      if (name.toLowerCase() === 'idempotency-key') return 'idempotency-key';
      if (name.toLowerCase() === 'user-agent') return 'jest';
      return undefined;
    })
  } as unknown as AuthenticatedRequest;

  it('rejects clock-in without a location before creating attendance records', async () => {
    const dataSource = {
      getRepository: jest.fn(),
      transaction: jest.fn()
    };
    const service = createService(dataSource);

    await expect(service.clockIn(user, {}, request)).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects clock-out with out-of-range coordinates before creating attendance records', async () => {
    const dataSource = {
      getRepository: jest.fn(),
      transaction: jest.fn()
    };
    const service = createService(dataSource);

    await expect(
      service.clockOut(
        user,
        {
          location: {
            latitude: 91,
            longitude: -93.265,
            accuracyMeters: 12
          }
        },
        request
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('records a valid clock-in location on the attendance event', async () => {
    const manager = createManager();
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
      transaction: jest.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager))
    };
    const service = createService(dataSource);

    await service.clockIn(
      user,
      {
        location: {
          latitude: 44.9778,
          longitude: -93.265,
          accuracyMeters: 12,
          source: 'browser',
          capturedAt: '2026-06-30T12:00:00.000Z',
          permissionState: 'granted'
        }
      },
      request
    );

    const attendanceEventCall = manager.create.mock.calls.find((call: unknown[]) => call[0] === AttendanceEvent);
    expect(attendanceEventCall).toBeDefined();
    expect((attendanceEventCall?.[1] as Partial<AttendanceEvent>).locationPoint).toEqual({
      type: 'Point',
      coordinates: [-93.265, 44.9778]
    });
    expect((attendanceEventCall?.[1] as Partial<AttendanceEvent>).locationAccuracyMeters).toBe(12);
  });

  it('records a valid clock-out location on the attendance event', async () => {
    const manager = createClockOutManager();
    const dataSource = {
      transaction: jest.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager))
    };
    const service = createService(dataSource);

    await service.clockOut(
      user,
      {
        location: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracyMeters: 8
        }
      },
      request
    );

    const attendanceEventCall = manager.create.mock.calls.find((call: unknown[]) => call[0] === AttendanceEvent);
    expect(attendanceEventCall).toBeDefined();
    expect((attendanceEventCall?.[1] as Partial<AttendanceEvent>).locationPoint).toEqual({
      type: 'Point',
      coordinates: [-74.006, 40.7128]
    });
    expect((attendanceEventCall?.[1] as Partial<AttendanceEvent>).locationAccuracyMeters).toBe(8);
  });
});

function createService(dataSource: object): AttendanceService {
  const policiesService = {
    effectivePolicy: jest.fn().mockResolvedValue({ policy: null, rules: DEFAULT_POLICY_RULES }),
    policyResult: jest.fn().mockReturnValue({ allowed: true, requiresReview: false, exceptions: [] })
  };
  const schedulingService = {
    resolveShift: jest.fn().mockResolvedValue({ assignment: null, instance: null, resolutionType: 'UNASSIGNED_CLOCK_IN' })
  };
  const auditService = { enqueue: jest.fn().mockResolvedValue(undefined) };

  return new AttendanceService(
    dataSource as never,
    {} as never,
    policiesService as never,
    schedulingService as never,
    auditService as never,
    {} as never,
    {} as never
  );
}

function createManager() {
  let session: Partial<WorkSession> | null = null;
  let nextId = 0;
  const manager = {
    query: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(null),
    findOneByOrFail: jest.fn().mockImplementation(async () => session),
    create: jest.fn((_entity: unknown, partial: object) => ({ ...partial })),
    save: jest.fn(async (entity: Partial<AttendanceEvent | WorkSession>) => {
      if (!entity.id) entity.id = `created-${++nextId}`;
      if ('status' in entity && entity.status === WorkSessionStatus.OPEN) session = entity as Partial<WorkSession>;
      return entity;
    })
  };

  return manager;
}

function createClockOutManager() {
  const session: Partial<WorkSession> = {
    id: 'work-session-id',
    organizationId: '33333333-3333-3333-3333-333333333333',
    employeeMembershipId: '22222222-2222-2222-2222-222222222222',
    status: WorkSessionStatus.OPEN,
    actualClockInAt: new Date('2026-06-30T08:00:00.000Z'),
    plannedShiftAssignmentId: null,
    plannedShiftInstanceId: null
  };
  let nextId = 0;
  const manager = {
    query: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockImplementation(async (entity: unknown) => {
      if (entity === WorkSession) return session;
      return null;
    }),
    create: jest.fn((_entity: unknown, partial: object) => ({ ...partial })),
    save: jest.fn(async (entity: Partial<AttendanceEvent | WorkSession>) => {
      if (!entity.id) entity.id = `created-${++nextId}`;
      return entity;
    })
  };

  return manager;
}
