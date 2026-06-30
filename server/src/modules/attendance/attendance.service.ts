import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedRequest, RequestUser } from '../../common/types/authenticated-request';
import { AuditLayer } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { PoliciesService } from '../policies/policies.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ClockDto } from './dto/attendance.dto';
import { AttendanceEvent, AttendanceEventType } from './entities/attendance-event.entity';
import { AttendanceException } from './entities/attendance-exception.entity';
import { ClockAttempt, ClockAttemptResult } from './entities/clock-attempt.entity';
import { ShiftResolutionType, WorkSession, WorkSessionStatus } from './entities/work-session.entity';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
    private readonly policiesService: PoliciesService,
    private readonly schedulingService: SchedulingService,
    private readonly auditService: AuditService,
    @InjectRepository(WorkSession) private readonly sessions: Repository<WorkSession>,
    @InjectRepository(AttendanceException) private readonly exceptions: Repository<AttendanceException>
  ) {}

  currentSession(user: RequestUser): Promise<WorkSession | null> {
    return this.sessions.findOne({
      where: { organizationId: user.organizationId, employeeMembershipId: user.membershipId, status: WorkSessionStatus.OPEN }
    });
  }

  history(user: RequestUser): Promise<WorkSession[]> {
    return this.sessions.find({
      where: { organizationId: user.organizationId, employeeMembershipId: user.membershipId },
      order: { actualClockInAt: 'DESC' },
      take: 50
    });
  }

  sessionsForOrg(user: RequestUser): Promise<WorkSession[]> {
    return this.sessions.find({ where: { organizationId: user.organizationId }, order: { actualClockInAt: 'DESC' }, take: 100 });
  }

  exceptionsForOrg(user: RequestUser): Promise<AttendanceException[]> {
    return this.exceptions.find({ where: { organizationId: user.organizationId, status: 'OPEN' }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async clockIn(user: RequestUser, dto: ClockDto, request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const idempotencyKey = this.idempotencyKey(request);
    this.requireValidLocation(dto);
    const serverNow = new Date();
    const existingAttempt = await this.dataSource.getRepository(ClockAttempt).findOne({
      where: { organizationId: user.organizationId, employeeMembershipId: user.membershipId, action: 'CLOCK_IN', idempotencyKey }
    });
    if (existingAttempt) return { duplicate: true, attempt: existingAttempt };

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${user.organizationId}:${user.membershipId}`]);
      const open = await manager.findOne(WorkSession, {
        where: { organizationId: user.organizationId, employeeMembershipId: user.membershipId, status: WorkSessionStatus.OPEN }
      });
      if (open) {
        const blocked = await manager.save(
          manager.create(ClockAttempt, this.attemptBase(user, request, dto, idempotencyKey, serverNow, 'CLOCK_IN', ClockAttemptResult.BLOCKED, 409, ['OPEN_SESSION_EXISTS'], 'Employee already has an open session'))
        );
        throw new ConflictException({ message: 'Employee already has an open work session', attemptId: blocked.id });
      }

      const effectivePolicy = await this.policiesService.effectivePolicy(user.organizationId, user.membershipId);
      if (effectivePolicy.rules.requireClockInPhoto && !dto.cameraEvidenceId) {
        await manager.save(
          manager.create(ClockAttempt, this.attemptBase(user, request, dto, idempotencyKey, serverNow, 'CLOCK_IN', ClockAttemptResult.BLOCKED, 400, ['MISSING_CLOCK_IN_PHOTO'], 'Clock-in photo is required'))
        );
        throw new BadRequestException('Clock-in photo is required');
      }
      if (dto.cameraEvidenceId) await this.mediaService.findForClock(user.organizationId, user.membershipId, dto.cameraEvidenceId);

      const shift = await this.schedulingService.resolveShift(user.organizationId, user.membershipId, serverNow, dto.requestedShiftAssignmentId ?? null);
      const policyResult = this.policiesService.policyResult(effectivePolicy.rules, { hasShift: Boolean(shift.assignment) });
      const policySnapshot = { policyId: effectivePolicy.policy?.id ?? null, rules: effectivePolicy.rules };

      const event = await manager.save(
        manager.create(AttendanceEvent, this.eventBase(user, request, dto, AttendanceEventType.CLOCK_IN, serverNow, policySnapshot, policyResult, {
          workSessionId: null,
          resolvedShiftAssignmentId: shift.assignment?.id ?? null,
          resolvedShiftInstanceId: shift.instance?.id ?? null,
          cameraRequired: effectivePolicy.rules.requireClockInPhoto
        }))
      );

      let session = await manager.save(
        manager.create(WorkSession, {
          organizationId: user.organizationId,
          employeeMembershipId: user.membershipId,
          plannedShiftAssignmentId: shift.assignment?.id ?? null,
          plannedShiftInstanceId: shift.instance?.id ?? null,
          status: WorkSessionStatus.OPEN,
          resolutionType: shift.resolutionType as ShiftResolutionType,
          reviewStatus: policyResult.requiresReview ? 'REQUIRED' : 'NOT_REQUIRED',
          actualClockInAt: serverNow,
          actualClockOutAt: null,
          grossMinutes: null,
          breakMinutes: null,
          netMinutes: null,
          clockInEventId: event.id,
          clockOutEventId: null,
          policySnapshot,
          policyResult,
          hasExceptions: policyResult.exceptions.length > 0,
          exceptionCount: policyResult.exceptions.length,
          createdById: user.userId,
          lastUpdatedById: user.userId
        })
      );
      event.workSessionId = session.id;
      await manager.save(event);

      for (const exception of policyResult.exceptions) {
        await manager.save(
          manager.create(AttendanceException, {
            organizationId: user.organizationId,
            employeeMembershipId: user.membershipId,
            workSessionId: session.id,
            attendanceEventId: event.id,
            code: exception.code,
            severity: exception.severity,
            message: exception.message,
            createdById: user.userId,
            lastUpdatedById: user.userId
          })
        );
      }

      const attempt = await manager.save(
        manager.create(ClockAttempt, {
          ...this.attemptBase(user, request, dto, idempotencyKey, serverNow, 'CLOCK_IN', policyResult.exceptions.length > 0 ? ClockAttemptResult.ACCEPTED_WITH_FLAGS : ClockAttemptResult.ACCEPTED, 201, null, null),
          createdWorkSessionId: session.id,
          createdAttendanceEventId: event.id,
          policyResult
        })
      );
      await this.auditService.enqueue({
        action: 'attendance.clock_in',
        layer: AuditLayer.ATTENDANCE,
        correlationId: request.correlationId ?? null,
        organizationId: user.organizationId,
        actorId: user.userId,
        entityType: 'WorkSession',
        entityId: session.id,
        metadata: { attemptId: attempt.id, eventId: event.id }
      });

      session = await manager.findOneByOrFail(WorkSession, { id: session.id });
      return {
        workSessionId: session.id,
        attendanceEventId: event.id,
        status: session.status,
        shiftResolution: {
          type: session.resolutionType,
          plannedShiftInstanceId: session.plannedShiftInstanceId,
          plannedShiftAssignmentId: session.plannedShiftAssignmentId,
          scheduledStartAt: shift.instance?.startAt ?? null,
          scheduledEndAt: shift.instance?.endAt ?? null
        },
        policyOutcome: policyResult,
        clockedInAt: session.actualClockInAt
      };
    });
  }

  async clockOut(user: RequestUser, dto: ClockDto, request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const idempotencyKey = this.idempotencyKey(request);
    this.requireValidLocation(dto);
    const serverNow = new Date();
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${user.organizationId}:${user.membershipId}`]);
      const existingAttempt = await manager.findOne(ClockAttempt, {
        where: { organizationId: user.organizationId, employeeMembershipId: user.membershipId, action: 'CLOCK_OUT', idempotencyKey }
      });
      if (existingAttempt) return { duplicate: true, attempt: existingAttempt };

      const session = await manager.findOne(WorkSession, {
        where: { organizationId: user.organizationId, employeeMembershipId: user.membershipId, status: WorkSessionStatus.OPEN }
      });
      if (!session) {
        await manager.save(
          manager.create(ClockAttempt, this.attemptBase(user, request, dto, idempotencyKey, serverNow, 'CLOCK_OUT', ClockAttemptResult.BLOCKED, 404, ['NO_OPEN_SESSION'], 'No open session'))
        );
        throw new NotFoundException('No open work session');
      }

      const effectivePolicy = await this.policiesService.effectivePolicy(user.organizationId, user.membershipId);
      if (effectivePolicy.rules.requireClockOutPhoto && !dto.cameraEvidenceId) throw new BadRequestException('Clock-out photo is required');
      if (dto.cameraEvidenceId) await this.mediaService.findForClock(user.organizationId, user.membershipId, dto.cameraEvidenceId);
      const policySnapshot = { policyId: effectivePolicy.policy?.id ?? null, rules: effectivePolicy.rules };
      const policyResult = { allowed: true, requiresReview: false, exceptions: [] };

      const event = await manager.save(
        manager.create(AttendanceEvent, this.eventBase(user, request, dto, AttendanceEventType.CLOCK_OUT, serverNow, policySnapshot, policyResult, {
          workSessionId: session.id,
          cameraRequired: effectivePolicy.rules.requireClockOutPhoto,
          resolvedShiftAssignmentId: session.plannedShiftAssignmentId,
          resolvedShiftInstanceId: session.plannedShiftInstanceId
        }))
      );
      session.actualClockOutAt = serverNow;
      session.status = WorkSessionStatus.CLOCKED_OUT;
      session.clockOutEventId = event.id;
      session.grossMinutes = Math.max(0, Math.round((serverNow.getTime() - session.actualClockInAt.getTime()) / 60_000));
      session.breakMinutes = 0;
      session.netMinutes = session.grossMinutes;
      session.lastUpdatedById = user.userId;
      await manager.save(session);

      await manager.save(
        manager.create(ClockAttempt, {
          ...this.attemptBase(user, request, dto, idempotencyKey, serverNow, 'CLOCK_OUT', ClockAttemptResult.ACCEPTED, 200, null, null),
          createdWorkSessionId: session.id,
          createdAttendanceEventId: event.id,
          policyResult
        })
      );
      return { workSessionId: session.id, attendanceEventId: event.id, status: session.status, clockedOutAt: session.actualClockOutAt, netMinutes: session.netMinutes };
    });
  }

  async breakEvent(user: RequestUser, dto: ClockDto, request: AuthenticatedRequest, type: AttendanceEventType): Promise<AttendanceEvent> {
    const serverNow = new Date();
    const session = await this.currentSession(user);
    if (!session) throw new NotFoundException('No open work session');
    const effectivePolicy = await this.policiesService.effectivePolicy(user.organizationId, user.membershipId);
    return this.dataSource.getRepository(AttendanceEvent).save(
      this.dataSource.getRepository(AttendanceEvent).create(
        this.eventBase(user, request, dto, type, serverNow, { policyId: effectivePolicy.policy?.id ?? null, rules: effectivePolicy.rules }, { allowed: true }, { workSessionId: session.id })
      )
    );
  }

  private idempotencyKey(request: AuthenticatedRequest): string {
    const key = request.header('idempotency-key');
    if (!key) throw new BadRequestException('Idempotency-Key header is required');
    return key;
  }

  private requireValidLocation(dto: ClockDto): void {
    const location = dto.location;
    if (!location) throw new BadRequestException('Location is required for clock actions');
    if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
      throw new BadRequestException('Valid latitude is required for clock actions');
    }
    if (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
      throw new BadRequestException('Valid longitude is required for clock actions');
    }
  }

  private attemptBase(
    user: RequestUser,
    request: AuthenticatedRequest,
    dto: ClockDto,
    idempotencyKey: string,
    receivedAt: Date,
    action: string,
    result: ClockAttemptResult,
    httpStatus: number,
    failureCodes: string[] | null,
    failureReason: string | null
  ): Partial<ClockAttempt> {
    return {
      organizationId: user.organizationId,
      employeeMembershipId: user.membershipId,
      action,
      idempotencyKey,
      correlationId: request.correlationId ?? null,
      receivedAt,
      result,
      httpStatus,
      failureCodes,
      failureReason,
      requestedShiftAssignmentId: dto.requestedShiftAssignmentId ?? null,
      requestContext: { ip: request.ip, userAgent: request.header('user-agent'), device: dto.device ?? null },
      policyResult: null,
      createdById: user.userId
    };
  }

  private eventBase(
    user: RequestUser,
    request: AuthenticatedRequest,
    dto: ClockDto,
    eventType: AttendanceEventType,
    serverReceivedAt: Date,
    policySnapshot: Record<string, unknown>,
    policyResult: Record<string, unknown>,
    extra: Partial<AttendanceEvent>
  ): Partial<AttendanceEvent> {
    const clientDate = dto.clientReportedAt ? new Date(dto.clientReportedAt) : null;
    return {
      organizationId: user.organizationId,
      employeeMembershipId: user.membershipId,
      eventType,
      eventSource: 'WEB',
      serverReceivedAt,
      clientReportedAt: clientDate,
      clientTimezone: dto.clientTimezone ?? null,
      clientUtcOffsetMinutes: dto.clientUtcOffsetMinutes ?? null,
      clientServerTimeDeltaSeconds: clientDate ? Math.round((clientDate.getTime() - serverReceivedAt.getTime()) / 1000) : null,
      requestedShiftAssignmentId: dto.requestedShiftAssignmentId ?? null,
      locationPoint: dto.location ? { type: 'Point', coordinates: [dto.location.longitude, dto.location.latitude] } : null,
      locationAccuracyMeters: dto.location?.accuracyMeters ?? null,
      locationSource: dto.location?.source ?? null,
      locationCapturedAt: dto.location?.capturedAt ? new Date(dto.location.capturedAt) : null,
      locationPermissionState: dto.location?.permissionState ?? null,
      geofenceResult: dto.location ? 'NOT_EVALUATED' : 'NOT_REQUIRED',
      matchedWorkSiteId: null,
      ipAddress: request.ip ?? null,
      networkContext: { correlationId: request.correlationId ?? null },
      deviceContext: dto.device ?? null,
      cameraEvidenceId: dto.cameraEvidenceId ?? null,
      evidenceValidationResult: dto.cameraEvidenceId ? { verified: true } : null,
      reason: dto.reason ?? null,
      metadata: null,
      policySnapshot,
      policyResult,
      createdById: user.userId,
      ...extra
    };
  }
}
