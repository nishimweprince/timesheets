import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';
import { PaginatedResult, paginate } from '../../common/types/paginated-result';
import { AuthenticatedRequest, RequestUser } from '../../common/types/authenticated-request';
import { AuditLayer } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { PoliciesService } from '../policies/policies.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ClockDto, ExceptionsQueryDto, HistoryQueryDto, HistoryStatusGroup } from './dto/attendance.dto';
import { mergeDeviceContext } from './device-context';
import { AttendanceEvent, AttendanceEventType } from './entities/attendance-event.entity';
import {
  AttendanceException,
  AttendanceExceptionStatus
} from './entities/attendance-exception.entity';
import { ClockAttempt, ClockAttemptResult } from './entities/clock-attempt.entity';
import { ShiftResolutionType, WorkSession, WorkSessionStatus } from './entities/work-session.entity';

const HISTORY_STATUS_GROUP_MAP: Record<HistoryStatusGroup, WorkSessionStatus[]> = {
  Approved: [WorkSessionStatus.APPROVED, WorkSessionStatus.LOCKED],
  Draft: [WorkSessionStatus.REJECTED, WorkSessionStatus.CANCELLED],
  Pending: [WorkSessionStatus.OPEN, WorkSessionStatus.CLOCKED_OUT, WorkSessionStatus.PENDING_REVIEW]
};

export interface AttendanceEventDetail {
  id: string;
  eventType: AttendanceEventType;
  eventSource: string;
  serverReceivedAt: Date;
  clientReportedAt: Date | null;
  clientTimezone: string | null;
  clientUtcOffsetMinutes: number | null;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    source: string | null;
    capturedAt: Date | null;
    permissionState: string | null;
  } | null;
  geofenceResult: string | null;
  matchedWorkSiteId: string | null;
  ipAddress: string | null;
  networkContext: Record<string, unknown> | null;
  deviceContext: Record<string, unknown> | null;
  cameraRequired: boolean;
  photoUrl: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
}

export interface WorkSessionDetail {
  session: WorkSession;
  events: AttendanceEventDetail[];
  exceptions: AttendanceException[];
}

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

  async history(user: RequestUser, query: HistoryQueryDto): Promise<PaginatedResult<WorkSession>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.sessions.findAndCount({
      where: {
        organizationId: user.organizationId,
        employeeMembershipId: user.membershipId,
        ...(query.status ? { status: In(HISTORY_STATUS_GROUP_MAP[query.status]) } : {})
      },
      order: { actualClockInAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    return paginate(data, total, page, pageSize);
  }

  sessionsForOrg(user: RequestUser, range?: { from?: string; to?: string }): Promise<WorkSession[]> {
    const filtered = range?.from && range?.to;
    return this.sessions.find({
      where: {
        organizationId: user.organizationId,
        ...(filtered ? { actualClockInAt: Between(new Date(range!.from!), new Date(range!.to!)) } : {})
      },
      order: { actualClockInAt: 'DESC' },
      take: filtered ? 500 : 100
    });
  }

  async sessionDetail(user: RequestUser, id: string): Promise<WorkSessionDetail> {
    const session = await this.sessions.findOne({ where: { id, organizationId: user.organizationId } });
    if (!session) throw new NotFoundException('Work session not found');

    const eventRepo = this.dataSource.getRepository(AttendanceEvent);
    const events = await eventRepo.find({
      where: { organizationId: user.organizationId, workSessionId: id },
      order: { serverReceivedAt: 'ASC' }
    });
    const exceptions = await this.exceptions.find({
      where: { organizationId: user.organizationId, workSessionId: id },
      order: { createdAt: 'ASC' }
    });

    const eventDetails = await Promise.all(
      events.map(async (event) => ({
        id: event.id,
        eventType: event.eventType,
        eventSource: event.eventSource,
        serverReceivedAt: event.serverReceivedAt,
        clientReportedAt: event.clientReportedAt,
        clientTimezone: event.clientTimezone,
        clientUtcOffsetMinutes: event.clientUtcOffsetMinutes,
        location: event.locationPoint
          ? {
              latitude: event.locationPoint.coordinates[1],
              longitude: event.locationPoint.coordinates[0],
              accuracyMeters: event.locationAccuracyMeters,
              source: event.locationSource,
              capturedAt: event.locationCapturedAt,
              permissionState: event.locationPermissionState
            }
          : null,
        geofenceResult: event.geofenceResult,
        matchedWorkSiteId: event.matchedWorkSiteId,
        ipAddress: event.ipAddress,
        networkContext: event.networkContext,
        deviceContext: event.deviceContext,
        cameraRequired: event.cameraRequired,
        photoUrl: event.cameraEvidenceId
          ? await this.mediaService.resolveOrgViewUrl(user.organizationId, event.cameraEvidenceId)
          : null,
        reason: event.reason,
        metadata: event.metadata
      }))
    );

    return { session, events: eventDetails, exceptions };
  }

  exceptionsForOrg(user: RequestUser, query: ExceptionsQueryDto = {}): Promise<AttendanceException[]> {
    const where: { organizationId: string; status?: string; severity?: string } = {
      organizationId: user.organizationId
    };
    const status = query.status ?? AttendanceExceptionStatus.OPEN;
    if (status !== 'ALL') {
      where.status = status;
    }
    if (query.severity?.trim()) {
      where.severity = query.severity.trim();
    }
    return this.exceptions.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100
    });
  }

  async exceptionById(user: RequestUser, id: string): Promise<AttendanceException> {
    const exception = await this.exceptions.findOne({
      where: { id, organizationId: user.organizationId }
    });
    if (!exception) throw new NotFoundException('Attendance exception not found');
    return exception;
  }

  async resolveException(user: RequestUser, id: string): Promise<AttendanceException> {
    return this.transitionException(user, id, AttendanceExceptionStatus.RESOLVED, 'attendance.exception.resolve');
  }

  async dismissException(user: RequestUser, id: string): Promise<AttendanceException> {
    return this.transitionException(user, id, AttendanceExceptionStatus.DISMISSED, 'attendance.exception.dismiss');
  }

  private async transitionException(
    user: RequestUser,
    id: string,
    status: AttendanceExceptionStatus,
    action: string
  ): Promise<AttendanceException> {
    const exception = await this.exceptionById(user, id);
    if (exception.status !== AttendanceExceptionStatus.OPEN) {
      throw new BadRequestException('Only open exceptions can be resolved or dismissed');
    }

    exception.status = status;
    exception.lastUpdatedById = user.userId;
    const saved = await this.exceptions.save(exception);

    await this.auditService.enqueue({
      action,
      layer: AuditLayer.ATTENDANCE,
      correlationId: null,
      organizationId: user.organizationId,
      actorId: user.userId,
      entityType: 'AttendanceException',
      entityId: saved.id,
      metadata: { status, code: saved.code, workSessionId: saved.workSessionId }
    });

    return saved;
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

      const shift = await this.schedulingService.resolveShift(
        user.organizationId,
        user.membershipId,
        serverNow,
        dto.requestedShiftAssignmentId ?? null,
        dto.requestedShiftInstanceId ?? null,
        dto.requestedShiftPatternAssignmentId ?? null
      );
      const policyResult = this.policiesService.policyResult(effectivePolicy.rules, { hasShift: Boolean(shift.patternAssignment ?? shift.assignment) });
      const policySnapshot = { policyId: effectivePolicy.policy?.id ?? null, rules: effectivePolicy.rules };

      const event = await manager.save(
        manager.create(AttendanceEvent, this.eventBase(user, request, dto, AttendanceEventType.CLOCK_IN, serverNow, policySnapshot, policyResult, {
          workSessionId: null,
          resolvedShiftAssignmentId: shift.assignment?.id ?? null,
          resolvedShiftPatternAssignmentId: shift.patternAssignment?.id ?? null,
          resolvedShiftInstanceId: shift.instance?.id ?? null,
          resolvedShiftPatternId: shift.pattern?.id ?? shift.instance?.patternId ?? null,
          cameraRequired: effectivePolicy.rules.requireClockInPhoto
        }))
      );

      let session = await manager.save(
        manager.create(WorkSession, {
          organizationId: user.organizationId,
          employeeMembershipId: user.membershipId,
          plannedShiftAssignmentId: shift.assignment?.id ?? null,
          plannedShiftPatternId: shift.pattern?.id ?? shift.instance?.patternId ?? null,
          plannedShiftPatternAssignmentId: shift.patternAssignment?.id ?? null,
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
          plannedShiftPatternId: session.plannedShiftPatternId,
          plannedShiftPatternAssignmentId: session.plannedShiftPatternAssignmentId,
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
          resolvedShiftPatternAssignmentId: session.plannedShiftPatternAssignmentId,
          resolvedShiftInstanceId: session.plannedShiftInstanceId,
          resolvedShiftPatternId: session.plannedShiftPatternId
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

  async approveSession(user: RequestUser, id: string): Promise<WorkSession> {
    return this.transitionReviewedSession(user, id, WorkSessionStatus.APPROVED, 'APPROVED', 'attendance.approve');
  }

  async rejectSession(user: RequestUser, id: string): Promise<WorkSession> {
    return this.transitionReviewedSession(user, id, WorkSessionStatus.REJECTED, 'REJECTED', 'attendance.reject');
  }

  async lockSession(user: RequestUser, id: string): Promise<WorkSession> {
    return this.transitionReviewedSession(user, id, WorkSessionStatus.LOCKED, 'LOCKED', 'attendance.lock');
  }

  private async transitionReviewedSession(
    user: RequestUser,
    id: string,
    status: WorkSessionStatus,
    reviewStatus: string,
    action: string
  ): Promise<WorkSession> {
    const session = await this.sessions.findOne({ where: { id, organizationId: user.organizationId } });
    if (!session) throw new NotFoundException('Work session not found');
    if (session.status === WorkSessionStatus.OPEN) throw new BadRequestException('Open sessions must be clocked out before review');
    if (status === WorkSessionStatus.LOCKED && session.status !== WorkSessionStatus.APPROVED) {
      throw new BadRequestException('Only approved sessions can be locked');
    }

    session.status = status;
    session.reviewStatus = reviewStatus;
    session.lastUpdatedById = user.userId;
    const saved = await this.sessions.save(session);

    await this.auditService.enqueue({
      action,
      layer: AuditLayer.ATTENDANCE,
      correlationId: null,
      organizationId: user.organizationId,
      actorId: user.userId,
      entityType: 'WorkSession',
      entityId: saved.id,
      metadata: { status, reviewStatus }
    });

    return saved;
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
      requestedShiftInstanceId: dto.requestedShiftInstanceId ?? null,
      requestedShiftPatternAssignmentId: dto.requestedShiftPatternAssignmentId ?? null,
      requestContext: {
        ip: request.ip,
        userAgent: request.header('user-agent'),
        device: mergeDeviceContext(request.header('user-agent'), dto.device ?? null)
      },
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
    const userAgent = request.header('user-agent');
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
      requestedShiftInstanceId: dto.requestedShiftInstanceId ?? null,
      requestedShiftPatternAssignmentId: dto.requestedShiftPatternAssignmentId ?? null,
      locationPoint: dto.location ? { type: 'Point', coordinates: [dto.location.longitude, dto.location.latitude] } : null,
      locationAccuracyMeters: dto.location?.accuracyMeters ?? null,
      locationSource: dto.location?.source ?? null,
      locationCapturedAt: dto.location?.capturedAt ? new Date(dto.location.capturedAt) : null,
      locationPermissionState: dto.location?.permissionState ?? null,
      geofenceResult: dto.location ? 'NOT_EVALUATED' : 'NOT_REQUIRED',
      matchedWorkSiteId: null,
      ipAddress: request.ip ?? null,
      networkContext: { correlationId: request.correlationId ?? null },
      deviceContext: mergeDeviceContext(userAgent, dto.device ?? null),
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

  async getEffectivePolicyRules(user: RequestUser) {
    const { rules } = await this.policiesService.effectivePolicy(user.organizationId, user.membershipId);
    return rules;
  }
}
