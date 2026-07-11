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
    firstName: 'Test',
    lastName: 'Employee',
    fullName: 'Test Employee',
    membershipStatus: 'ACTIVE',
    primaryWorkSiteId: null,
    roleNames: ['Employee'],
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

  it('persists client-supplied device context on clock-in', async () => {
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
          accuracyMeters: 12
        },
        device: {
          deviceClass: 'desktop',
          browser: 'Chrome',
          browserVersion: '120.0.0',
          os: 'macOS',
          platform: 'MacIntel',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
          touchCapable: false,
          source: 'client'
        }
      },
      request
    );

    const attendanceEventCall = manager.create.mock.calls.find((call: unknown[]) => call[0] === AttendanceEvent);
    const deviceContext = (attendanceEventCall?.[1] as Partial<AttendanceEvent>).deviceContext as Record<string, unknown>;
    expect(deviceContext).toMatchObject({
      deviceClass: 'desktop',
      browser: 'Chrome',
      os: 'macOS',
      source: 'merged'
    });
  });

  it('derives device context from User-Agent when client omits device', async () => {
    const manager = createManager();
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
      transaction: jest.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager))
    };
    const service = createService(dataSource);
    const mobileRequest = {
      ip: '127.0.0.1',
      correlationId: 'correlation-id',
      header: jest.fn((name: string) => {
        if (name.toLowerCase() === 'idempotency-key') return 'idempotency-key-mobile';
        if (name.toLowerCase() === 'user-agent') {
          return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        }
        return undefined;
      })
    } as unknown as AuthenticatedRequest;

    await service.clockIn(
      user,
      {
        location: {
          latitude: 44.9778,
          longitude: -93.265,
          accuracyMeters: 12
        }
      },
      mobileRequest
    );

    const attendanceEventCall = manager.create.mock.calls.find((call: unknown[]) => call[0] === AttendanceEvent);
    const deviceContext = (attendanceEventCall?.[1] as Partial<AttendanceEvent>).deviceContext as Record<string, unknown>;
    expect(deviceContext).toMatchObject({
      deviceClass: 'mobile',
      browser: 'Safari',
      os: 'iOS',
      source: 'server'
    });
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

  it('approves a clocked-out session and records an audit event', async () => {
    const session = {
      id: 'work-session-id',
      organizationId: user.organizationId,
      employeeMembershipId: user.membershipId,
      status: WorkSessionStatus.CLOCKED_OUT,
      reviewStatus: 'REQUIRED'
    } as WorkSession;
    const sessions = {
      findOne: jest.fn().mockResolvedValue(session),
      save: jest.fn(async (value: WorkSession) => value)
    };
    const auditService = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = createService({}, { sessions, auditService });

    const result = await service.approveSession(user, session.id);

    expect(result.status).toBe(WorkSessionStatus.APPROVED);
    expect(result.reviewStatus).toBe('APPROVED');
    expect(result.lastUpdatedById).toBe(user.userId);
    expect(auditService.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      action: 'attendance.approve',
      entityId: session.id
    }));
  });

  it('rejects review transitions for open sessions', async () => {
    const session = {
      id: 'work-session-id',
      organizationId: user.organizationId,
      employeeMembershipId: user.membershipId,
      status: WorkSessionStatus.OPEN,
      reviewStatus: 'REQUIRED'
    } as WorkSession;
    const sessions = {
      findOne: jest.fn().mockResolvedValue(session),
      save: jest.fn()
    };
    const service = createService({}, { sessions });

    await expect(service.rejectSession(user, session.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('locks only approved sessions', async () => {
    const session = {
      id: 'work-session-id',
      organizationId: user.organizationId,
      employeeMembershipId: user.membershipId,
      status: WorkSessionStatus.CLOCKED_OUT,
      reviewStatus: 'NOT_REQUIRED'
    } as WorkSession;
    const sessions = {
      findOne: jest.fn().mockResolvedValue(session),
      save: jest.fn()
    };
    const service = createService({}, { sessions });

    await expect(service.lockSession(user, session.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('lists open exceptions by default and filters by status', async () => {
    const openException = { id: 'ex-open', status: 'OPEN' };
    const exceptions = {
      find: jest.fn().mockResolvedValue([openException])
    };
    const service = createService({}, { exceptions });

    await service.exceptionsForOrg(user);
    expect(exceptions.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: user.organizationId, status: 'OPEN' })
      })
    );

    await service.exceptionsForOrg(user, { status: 'ALL' });
    expect(exceptions.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { organizationId: user.organizationId }
      })
    );
  });

  it('resolves an open exception and audits the transition', async () => {
    const exception = {
      id: 'exception-id',
      organizationId: user.organizationId,
      status: 'OPEN',
      code: 'UNPLANNED_CLOCK_IN',
      workSessionId: 'session-id',
      lastUpdatedById: null
    };
    const auditService = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const exceptions = {
      findOne: jest.fn().mockResolvedValue(exception),
      save: jest.fn().mockImplementation(async (row) => row)
    };
    const service = createService({}, { exceptions, auditService });

    const saved = await service.resolveException(user, exception.id);

    expect(saved.status).toBe('RESOLVED');
    expect(exceptions.save).toHaveBeenCalled();
    expect(auditService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'attendance.exception.resolve',
        entityType: 'AttendanceException',
        entityId: exception.id
      })
    );
  });

  it('rejects resolving a non-open exception', async () => {
    const exception = {
      id: 'exception-id',
      organizationId: user.organizationId,
      status: 'RESOLVED'
    };
    const exceptions = {
      findOne: jest.fn().mockResolvedValue(exception),
      save: jest.fn()
    };
    const service = createService({}, { exceptions });

    await expect(service.dismissException(user, exception.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(exceptions.save).not.toHaveBeenCalled();
  });

  it('hydrates a session detail with events, resolved photo url, and location', async () => {
    const session = {
      id: 'work-session-id',
      organizationId: user.organizationId,
      employeeMembershipId: user.membershipId,
      status: WorkSessionStatus.CLOCKED_OUT
    } as WorkSession;
    const event = {
      id: 'event-id',
      eventType: 'CLOCK_IN',
      eventSource: 'WEB',
      serverReceivedAt: new Date('2026-06-30T08:00:00.000Z'),
      clientReportedAt: null,
      clientTimezone: null,
      clientUtcOffsetMinutes: null,
      locationPoint: { type: 'Point', coordinates: [-93.265, 44.9778] },
      locationAccuracyMeters: 12,
      locationSource: 'browser',
      locationCapturedAt: null,
      locationPermissionState: 'granted',
      geofenceResult: 'NOT_EVALUATED',
      matchedWorkSiteId: null,
      ipAddress: '127.0.0.1',
      networkContext: null,
      deviceContext: { platform: 'iOS' },
      cameraRequired: true,
      cameraEvidenceId: 'media-asset-id',
      reason: null,
      metadata: null
    };
    const sessions = { findOne: jest.fn().mockResolvedValue(session) };
    const exceptions = { find: jest.fn().mockResolvedValue([]) };
    const eventRepo = { find: jest.fn().mockResolvedValue([event]) };
    const dataSource = { getRepository: jest.fn().mockReturnValue(eventRepo) };
    const mediaService = { resolveOrgViewUrl: jest.fn().mockResolvedValue('https://signed.example/photo') };
    const service = createService(dataSource, { sessions, exceptions, mediaService });

    const detail = await service.sessionDetail(user, session.id);

    expect(detail.session).toBe(session);
    expect(detail.events).toHaveLength(1);
    expect(detail.events[0].location).toEqual({
      latitude: 44.9778,
      longitude: -93.265,
      accuracyMeters: 12,
      source: 'browser',
      capturedAt: null,
      permissionState: 'granted'
    });
    expect(detail.events[0].photoUrl).toBe('https://signed.example/photo');
    expect(mediaService.resolveOrgViewUrl).toHaveBeenCalledWith(user.organizationId, 'media-asset-id');
  });
});

function createService(
  dataSource: object,
  overrides: {
    sessions?: object
    exceptions?: object
    auditService?: object
    mediaService?: object
  } = {}
): AttendanceService {
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
    (overrides.mediaService ?? {}) as never,
    policiesService as never,
    schedulingService as never,
    (overrides.auditService ?? auditService) as never,
    (overrides.sessions ?? {}) as never,
    (overrides.exceptions ?? {}) as never
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
    plannedShiftPatternId: null,
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
