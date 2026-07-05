import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, In, Repository } from "typeorm";
import { DateTime } from "luxon";
import { Frequency, RRule, Weekday, rrulestr } from "rrule";
import { PaginatedResult, paginate } from "../../common/types/paginated-result";
import { RequestUser } from "../../common/types/authenticated-request";
import {
  ShiftPattern,
  ShiftPatternFreq,
} from "./entities/shift-pattern.entity";
import {
  ShiftInstance,
  ShiftInstanceStatus,
} from "./entities/shift-instance.entity";
import {
  ShiftAssignment,
  ShiftAssignmentStatus,
} from "./entities/shift-assignment.entity";
import {
  ShiftPatternAssignment,
  ShiftPatternAssignmentStatus,
} from "./entities/shift-pattern-assignment.entity";
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import {
  CreateShiftAssignmentDto,
  CreateShiftPatternAssignmentDto,
  CreateShiftInstanceDto,
  CreateShiftPatternDto,
  ListShiftPatternAssignmentsQueryDto,
  ListSchedulingQueryDto,
  OverrideShiftInstanceDto,
  ScheduleDateRangeQueryDto,
  UpdateShiftPatternAssignmentDto,
  UpdateShiftPatternDto,
} from "./dto/scheduling.dto";

const MATERIALIZE_DAYS = 60;

export interface MyShift {
  assignmentId: string;
  employeeMembershipId: string;
  shiftInstanceId: string;
  assignmentStatus: ShiftAssignmentStatus;
  assignedAt: Date;
  shift: ShiftInstance;
}

export type PatternDerivedShift = ShiftInstance & { patternName: string };

const ISO_WEEKDAY_TO_RRULE: Record<number, Weekday> = {
  1: RRule.MO,
  2: RRule.TU,
  3: RRule.WE,
  4: RRule.TH,
  5: RRule.FR,
  6: RRule.SA,
  7: RRule.SU,
};

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ShiftPattern)
    private readonly patterns: Repository<ShiftPattern>,
    @InjectRepository(ShiftInstance)
    private readonly instances: Repository<ShiftInstance>,
    @InjectRepository(ShiftAssignment)
    private readonly assignments: Repository<ShiftAssignment>,
    @InjectRepository(ShiftPatternAssignment)
    private readonly patternAssignments: Repository<ShiftPatternAssignment>,
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
  ) {}

  // Patterns

  async createPattern(
    user: RequestUser,
    dto: CreateShiftPatternDto,
  ): Promise<ShiftPattern> {
    const timezone = dto.timezone ?? "America/Chicago";
    const { rrule, freq, daysOfWeek } = this.buildRrule(
      dto.daysOfWeek,
      dto.freq,
      dto.effectiveFrom,
    );
    const pattern = await this.patterns.save(
      this.patterns.create({
        organizationId: user.organizationId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone,
        workSiteId: dto.workSiteId ?? null,
        rrule,
        freq,
        daysOfWeek,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil ?? null,
        active: true,
      }),
    );
    await this.materializeUpcoming(pattern);
    return pattern;
  }

  async updatePattern(
    user: RequestUser,
    id: string,
    dto: UpdateShiftPatternDto,
  ): Promise<ShiftPattern> {
    const pattern = await this.patterns.findOne({
      where: { id, organizationId: user.organizationId },
    });
    if (!pattern) throw new NotFoundException("Shift pattern not found");
    if (dto.name !== undefined) pattern.name = dto.name;
    if (dto.startTime !== undefined) pattern.startTime = dto.startTime;
    if (dto.endTime !== undefined) pattern.endTime = dto.endTime;
    if (dto.timezone !== undefined) pattern.timezone = dto.timezone;
    if (dto.workSiteId !== undefined)
      pattern.workSiteId = dto.workSiteId ?? null;
    if (dto.effectiveFrom !== undefined)
      pattern.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveUntil !== undefined)
      pattern.effectiveUntil = dto.effectiveUntil ?? null;
    if (dto.active !== undefined) pattern.active = dto.active;

    const recurrenceChanged =
      dto.daysOfWeek !== undefined ||
      dto.freq !== undefined ||
      dto.effectiveFrom !== undefined;
    if (recurrenceChanged) {
      const days = dto.daysOfWeek ?? pattern.daysOfWeek;
      const freq = dto.freq ?? pattern.freq ?? undefined;
      const {
        rrule,
        freq: outFreq,
        daysOfWeek,
      } = this.buildRrule(days, freq, pattern.effectiveFrom);
      pattern.rrule = rrule;
      pattern.freq = outFreq;
      pattern.daysOfWeek = daysOfWeek;
    }

    const saved = await this.patterns.save(pattern);
    if (saved.active) await this.materializeUpcoming(saved);
    return saved;
  }

  async archivePattern(user: RequestUser, id: string): Promise<ShiftPattern> {
    const pattern = await this.patterns.findOne({
      where: { id, organizationId: user.organizationId },
    });
    if (!pattern) throw new NotFoundException("Shift pattern not found");
    pattern.active = false;
    const saved = await this.patterns.save(pattern);
    const today = DateTime.utc().toISODate() as string;
    await this.instances
      .createQueryBuilder()
      .update()
      .set({ status: ShiftInstanceStatus.CANCELLED })
      .where("organization_id = :orgId", { orgId: user.organizationId })
      .andWhere("pattern_id = :patternId", { patternId: pattern.id })
      .andWhere("shift_date >= :today", { today })
      .andWhere("status = :scheduled", {
        scheduled: ShiftInstanceStatus.SCHEDULED,
      })
      .execute();
    return saved;
  }

  async findPatterns(
    user: RequestUser,
    query: ListSchedulingQueryDto,
  ): Promise<PaginatedResult<ShiftPattern>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.patterns.findAndCount({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(data, total, page, pageSize);
  }

  // Instances

  async createInstance(
    user: RequestUser,
    dto: CreateShiftInstanceDto,
  ): Promise<ShiftInstance> {
    const startAt = new Date(dto.startAt);
    const shiftDate = DateTime.fromJSDate(startAt).toUTC().toISODate();
    if (!shiftDate) throw new BadRequestException("Invalid startAt");
    if (dto.patternId) await this.ensurePatternInOrganization(user.organizationId, dto.patternId);
    return this.instances.save(
      this.instances.create({
        organizationId: user.organizationId,
        patternId: dto.patternId ?? null,
        workSiteId: dto.workSiteId ?? null,
        shiftDate,
        startAt,
        endAt: new Date(dto.endAt),
        status: ShiftInstanceStatus.SCHEDULED,
      }),
    );
  }

  async overrideInstance(
    user: RequestUser,
    id: string,
    dto: OverrideShiftInstanceDto,
  ): Promise<ShiftInstance> {
    const instance = await this.instances.findOne({
      where: { id, organizationId: user.organizationId },
    });
    if (!instance) throw new NotFoundException("Shift instance not found");
    if (dto.startAt !== undefined) instance.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) instance.endAt = new Date(dto.endAt);
    if (dto.status !== undefined) instance.status = dto.status;
    else if (dto.startAt !== undefined || dto.endAt !== undefined)
      instance.status = ShiftInstanceStatus.MODIFIED;
    return this.instances.save(instance);
  }

  async cancelInstance(user: RequestUser, id: string): Promise<ShiftInstance> {
    const instance = await this.instances.findOne({
      where: { id, organizationId: user.organizationId },
    });
    if (!instance) throw new NotFoundException("Shift instance not found");
    instance.status = ShiftInstanceStatus.CANCELLED;
    return this.instances.save(instance);
  }

  async findInstances(
    user: RequestUser,
    query: ListSchedulingQueryDto,
  ): Promise<PaginatedResult<ShiftInstance>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: FindOptionsWhere<ShiftInstance> = {
      organizationId: user.organizationId,
    };
    if (query.patternId) where.patternId = query.patternId;
    if (query.from && query.to)
      where.shiftDate = Between(query.from, query.to) as unknown as string;
    else if (query.from)
      where.shiftDate = Between(query.from, "9999-12-31") as unknown as string;
    else if (query.to)
      where.shiftDate = Between("0001-01-01", query.to) as unknown as string;
    const [data, total] = await this.instances.findAndCount({
      where,
      order: { startAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(data, total, page, pageSize);
  }

  // Legacy instance-level assignments. New scheduling should assign employees at the
  // shift pattern level so attendance resolution can bind a pattern assignment and
  // the concrete materialized instance without creating shift_assignments rows.

  async assign(
    user: RequestUser,
    dto: CreateShiftAssignmentDto,
  ): Promise<ShiftAssignment> {
    const instance = await this.instances.findOne({
      where: { id: dto.shiftInstanceId, organizationId: user.organizationId },
    });
    if (!instance) throw new NotFoundException("Shift instance not found");
    await this.ensureEmployeeMembershipInOrganization(user.organizationId, dto.employeeMembershipId);
    return this.assignments.save(
      this.assignments.create({
        organizationId: user.organizationId,
        employeeMembershipId: dto.employeeMembershipId,
        shiftInstanceId: dto.shiftInstanceId,
      }),
    );
  }

  async findPatternAssignments(
    user: RequestUser,
    query: ListShiftPatternAssignmentsQueryDto,
  ): Promise<PaginatedResult<ShiftPatternAssignment>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: FindOptionsWhere<ShiftPatternAssignment> = {
      organizationId: user.organizationId,
    };
    if (query.shiftPatternId) where.shiftPatternId = query.shiftPatternId;
    if (query.employeeMembershipId) where.employeeMembershipId = query.employeeMembershipId;
    if (query.status) where.status = query.status;
    const [data, total] = await this.patternAssignments.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(data, total, page, pageSize);
  }

  async assignPattern(user: RequestUser, dto: CreateShiftPatternAssignmentDto): Promise<ShiftPatternAssignment> {
    await this.ensurePatternInOrganization(user.organizationId, dto.shiftPatternId);
    await this.ensureEmployeeMembershipInOrganization(user.organizationId, dto.employeeMembershipId);
    return this.patternAssignments.save(
      this.patternAssignments.create({
        organizationId: user.organizationId,
        employeeMembershipId: dto.employeeMembershipId,
        shiftPatternId: dto.shiftPatternId,
        effectiveFrom: dto.effectiveFrom ?? null,
        effectiveUntil: dto.effectiveUntil ?? null,
      })
    );
  }

  async updatePatternAssignment(
    user: RequestUser,
    id: string,
    dto: UpdateShiftPatternAssignmentDto,
  ): Promise<ShiftPatternAssignment> {
    const assignment = await this.patternAssignments.findOne({
      where: { id, organizationId: user.organizationId },
    });
    if (!assignment) throw new NotFoundException("Shift pattern assignment not found");
    if (dto.status !== undefined) assignment.status = dto.status;
    if (dto.effectiveFrom !== undefined) assignment.effectiveFrom = dto.effectiveFrom ?? null;
    if (dto.effectiveUntil !== undefined) assignment.effectiveUntil = dto.effectiveUntil ?? null;
    return this.patternAssignments.save(assignment);
  }

  async cancelPatternAssignment(user: RequestUser, id: string): Promise<ShiftPatternAssignment> {
    return this.updatePatternAssignment(user, id, {
      status: ShiftPatternAssignmentStatus.CANCELLED,
    });
  }

  async findMyShifts(user: RequestUser, query: ScheduleDateRangeQueryDto): Promise<PatternDerivedShift[]> {
    const assignments = await this.patternAssignments.find({
      where: {
        organizationId: user.organizationId,
        employeeMembershipId: user.membershipId,
        status: ShiftPatternAssignmentStatus.ACTIVE
      }
    });
    const patternIds = Array.from(new Set(assignments.map((assignment) => assignment.shiftPatternId)));
    if (patternIds.length === 0) return [];

    const patterns = await this.patterns.find({
      where: { id: In(patternIds), organizationId: user.organizationId }
    });
    const patternNames = new Map(patterns.map((pattern) => [pattern.id, pattern.name]));

    const instances = await this.instances.find({
      where: {
        organizationId: user.organizationId,
        patternId: In(patternIds),
        shiftDate: Between(query.from, query.to) as unknown as string,
        status: In([ShiftInstanceStatus.SCHEDULED, ShiftInstanceStatus.MODIFIED])
      },
      order: { startAt: 'ASC' }
    });

    return instances.map((instance) => ({
      ...instance,
      patternName: instance.patternId ? patternNames.get(instance.patternId) ?? '' : ''
    }));
  }

  async findAssignments(user: RequestUser, query: ListSchedulingQueryDto): Promise<PaginatedResult<ShiftAssignment>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.assignments.findAndCount({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(data, total, page, pageSize);
  }

  async findMyAssignedShifts(
    user: RequestUser,
    query: ListSchedulingQueryDto,
  ): Promise<PaginatedResult<MyShift>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const assignments = await this.assignments.find({
      where: {
        organizationId: user.organizationId,
        employeeMembershipId: user.membershipId,
        status: ShiftAssignmentStatus.ACTIVE,
      },
      order: { createdAt: "DESC" },
    });

    if (assignments.length === 0) return paginate([], 0, page, pageSize);

    const where: FindOptionsWhere<ShiftInstance> = {
      organizationId: user.organizationId,
      id: In(assignments.map((assignment) => assignment.shiftInstanceId)),
    };
    if (query.patternId) where.patternId = query.patternId;
    if (query.from && query.to)
      where.shiftDate = Between(query.from, query.to) as unknown as string;
    else if (query.from)
      where.shiftDate = Between(query.from, "9999-12-31") as unknown as string;
    else if (query.to)
      where.shiftDate = Between("0001-01-01", query.to) as unknown as string;

    const shifts = await this.instances.find({
      where,
      order: { startAt: "ASC" },
    });
    const assignmentByInstanceId = new Map(
      assignments.map((assignment) => [assignment.shiftInstanceId, assignment]),
    );
    const data = shifts
      .map((shift) => {
        const assignment = assignmentByInstanceId.get(shift.id);
        if (!assignment) return null;
        return {
          assignmentId: assignment.id,
          employeeMembershipId: assignment.employeeMembershipId,
          shiftInstanceId: assignment.shiftInstanceId,
          assignmentStatus: assignment.status,
          assignedAt: assignment.createdAt,
          shift,
        };
      })
      .filter((shift): shift is MyShift => shift !== null);

    const start = (page - 1) * pageSize;
    return paginate(
      data.slice(start, start + pageSize),
      data.length,
      page,
      pageSize,
    );
  }

  // Materialization

  async materializeAllActive(): Promise<void> {
    const active = await this.patterns.find({ where: { active: true } });
    for (const pattern of active) {
      try {
        await this.materializeUpcoming(pattern);
      } catch (err) {
        // Continue on per-pattern failure — cron retries next day.
      }
    }
  }

  async materializeUpcoming(pattern: ShiftPattern): Promise<void> {
    const from = DateTime.utc().startOf("day");
    const untilCap = from.plus({ days: MATERIALIZE_DAYS });
    const patternUntil = pattern.effectiveUntil
      ? DateTime.fromISO(pattern.effectiveUntil, { zone: "utc" }).endOf("day")
      : null;
    const to =
      patternUntil && patternUntil < untilCap ? patternUntil : untilCap;
    if (to <= from) return;

    const dates = this.enumerateDates(pattern, from, to);
    if (dates.length === 0) return;

    const rows = dates
      .map((iso) => this.buildInstanceForDate(pattern, iso))
      .filter(
        (row): row is ReturnType<typeof this.buildInstanceForDate> & object =>
          row !== null,
      );

    if (rows.length === 0) return;

    await this.instances
      .createQueryBuilder()
      .insert()
      .into(ShiftInstance)
      .values(rows)
      .orIgnore()
      .execute();
  }

  private enumerateDates(
    pattern: ShiftPattern,
    from: DateTime,
    to: DateTime,
  ): string[] {
    if (pattern.rrule) {
      const dtstart = DateTime.fromISO(pattern.effectiveFrom, {
        zone: "utc",
      }).toJSDate();
      const rule = rrulestr(pattern.rrule, { dtstart });
      return rule
        .between(from.toJSDate(), to.toJSDate(), true)
        .map((d) => DateTime.fromJSDate(d).toUTC().toISODate())
        .filter((d): d is string => Boolean(d));
    }
    const effectiveFrom = DateTime.fromISO(pattern.effectiveFrom, {
      zone: "utc",
    });
    if (effectiveFrom < from || effectiveFrom > to) return [];
    const iso = effectiveFrom.toISODate();
    return iso ? [iso] : [];
  }

  private buildInstanceForDate(pattern: ShiftPattern, shiftDate: string) {
    const [startHour, startMinute] = pattern.startTime.split(":").map(Number);
    const [endHour, endMinute] = pattern.endTime.split(":").map(Number);
    const startLocal = DateTime.fromISO(shiftDate, {
      zone: pattern.timezone,
    }).set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0,
    });
    let endLocal = startLocal.set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0,
    });
    if (endLocal <= startLocal) endLocal = endLocal.plus({ days: 1 });
    if (!startLocal.isValid || !endLocal.isValid) return null;
    return {
      organizationId: pattern.organizationId,
      patternId: pattern.id,
      workSiteId: pattern.workSiteId,
      shiftDate,
      startAt: startLocal.toUTC().toJSDate(),
      endAt: endLocal.toUTC().toJSDate(),
      status: ShiftInstanceStatus.SCHEDULED,
    };
  }

  private buildRrule(
    daysOfWeek: number[],
    freq: ShiftPatternFreq | undefined,
    effectiveFrom: string,
  ): {
    rrule: string | null;
    freq: ShiftPatternFreq | null;
    daysOfWeek: number[];
  } {
    if (!daysOfWeek || daysOfWeek.length === 0) {
      return { rrule: null, freq: null, daysOfWeek: [] };
    }
    const normalizedDays = Array.from(new Set(daysOfWeek)).sort(
      (a, b) => a - b,
    );
    const resolvedFreq = freq ?? ShiftPatternFreq.WEEKLY;
    const byweekday = normalizedDays.map((iso) => {
      const wd = ISO_WEEKDAY_TO_RRULE[iso];
      if (!wd) throw new BadRequestException(`Invalid ISO weekday ${iso}`);
      return wd;
    });
    const dtstart = DateTime.fromISO(effectiveFrom, { zone: "utc" }).toJSDate();
    const rule = new RRule({
      freq:
        resolvedFreq === ShiftPatternFreq.DAILY
          ? Frequency.DAILY
          : Frequency.WEEKLY,
      byweekday,
      dtstart,
    });
    return {
      rrule: rule.toString(),
      freq: resolvedFreq,
      daysOfWeek: normalizedDays,
    };
  }

  private async ensurePatternInOrganization(organizationId: string, patternId: string): Promise<ShiftPattern> {
    const pattern = await this.patterns.findOne({ where: { id: patternId, organizationId } });
    if (!pattern) throw new NotFoundException('Shift pattern not found');
    return pattern;
  }

  private async ensureEmployeeMembershipInOrganization(organizationId: string, employeeMembershipId: string): Promise<void> {
    const membership = await this.memberships.findOne({ where: { id: employeeMembershipId, organizationId } });
    if (!membership) throw new NotFoundException('Employee not found');
  }

  // Clock-in resolution prefers pattern-level assignments, then falls back to
  // legacy instance-level shift_assignments for historical data.

  async resolveShift(
    organizationId: string,
    employeeMembershipId: string,
    at: Date,
    requestedAssignmentId?: string | null,
  ): Promise<{
    assignment: ShiftAssignment | null;
    pattern: ShiftPattern | null;
    instance: ShiftInstance | null;
    resolutionType: string;
  }> {
    if (requestedAssignmentId) {
      const assignment = await this.assignments.findOne({
        where: {
          id: requestedAssignmentId,
          organizationId,
          employeeMembershipId,
          status: ShiftAssignmentStatus.ACTIVE,
        },
      });
      if (assignment) {
        const instance = await this.instances.findOne({
          where: {
            id: assignment.shiftInstanceId,
            organizationId,
            status: In([
              ShiftInstanceStatus.SCHEDULED,
              ShiftInstanceStatus.MODIFIED,
            ]),
          },
        });
        if (instance)
          return {
            assignment,
            pattern: null,
            instance,
            resolutionType: "MATCHED_ALTERNATIVE_ASSIGNED_SHIFT",
          };
      }
    }

    const windowStart = new Date(at.getTime() - 6 * 60 * 60 * 1000);
    const windowEnd = new Date(at.getTime() + 6 * 60 * 60 * 1000);
    const candidateInstances = await this.instances.find({
      where: {
        organizationId,
        status: In([
          ShiftInstanceStatus.SCHEDULED,
          ShiftInstanceStatus.MODIFIED,
        ]),
        startAt: Between(windowStart, windowEnd),
      },
      order: { startAt: "ASC" },
    });
    const instanceIds = candidateInstances.map((instance) => instance.id);
    if (instanceIds.length === 0)
      return {
        assignment: null,
        pattern: null,
        instance: null,
        resolutionType: "UNASSIGNED_CLOCK_IN",
      };

    const patternIds = candidateInstances.map((instance) => instance.patternId).filter((id): id is string => Boolean(id));
    if (patternIds.length > 0) {
      const patternAssignments = await this.patternAssignments.find({
        where: {
          organizationId,
          employeeMembershipId,
          shiftPatternId: In(patternIds),
          status: ShiftPatternAssignmentStatus.ACTIVE,
        },
      });
      const assignedPatternIds = patternAssignments.map((assignment) => assignment.shiftPatternId);
      const patterns = assignedPatternIds.length > 0
        ? await this.patterns.find({
            where: { id: In(assignedPatternIds), organizationId, active: true },
          })
        : [];
      const patternIdSet = new Set(patterns.map((pattern) => pattern.id));
      const instance = candidateInstances.find((item) => item.patternId && patternIdSet.has(item.patternId));
      const pattern = instance?.patternId ? patterns.find((item) => item.id === instance.patternId) ?? null : null;
      if (instance && pattern) {
        const insideWindow = at >= instance.startAt && at <= instance.endAt;
        return {
          assignment: null,
          pattern,
          instance,
          resolutionType: insideWindow ? 'MATCHED_ASSIGNED_SHIFT' : 'MATCHED_OUTSIDE_ALLOWED_WINDOW'
        };
      }
    }

    // Backwards-compatibility fallback for historical shift_assignments rows.
    const assignments = await this.assignments.find({
      where: {
        organizationId,
        employeeMembershipId,
        status: ShiftAssignmentStatus.ACTIVE,
      },
    });
    const assignment = assignments.find((item) =>
      instanceIds.includes(item.shiftInstanceId),
    );
    const instance = assignment
      ? (candidateInstances.find(
          (item) => item.id === assignment.shiftInstanceId,
        ) ?? null)
      : null;
    if (!assignment || !instance)
      return {
        assignment: null,
        pattern: null,
        instance: null,
        resolutionType: "UNASSIGNED_CLOCK_IN",
      };
    const insideWindow = at >= instance.startAt && at <= instance.endAt;
    return {
      assignment,
      pattern: null,
      instance,
      resolutionType: insideWindow
        ? "MATCHED_ASSIGNED_SHIFT"
        : "MATCHED_OUTSIDE_ALLOWED_WINDOW",
    };
  }
}
