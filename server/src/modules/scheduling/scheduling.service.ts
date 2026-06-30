import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PaginatedResult, paginate } from '../../common/types/paginated-result';
import { RequestUser } from '../../common/types/authenticated-request';
import { ShiftTemplate } from './entities/shift-template.entity';
import { ShiftInstance, ShiftInstanceStatus } from './entities/shift-instance.entity';
import { ShiftAssignment, ShiftAssignmentStatus } from './entities/shift-assignment.entity';
import { CreateShiftAssignmentDto, CreateShiftInstanceDto, CreateShiftTemplateDto, ListSchedulingQueryDto } from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ShiftTemplate) private readonly templates: Repository<ShiftTemplate>,
    @InjectRepository(ShiftInstance) private readonly instances: Repository<ShiftInstance>,
    @InjectRepository(ShiftAssignment) private readonly assignments: Repository<ShiftAssignment>
  ) {}

  createTemplate(user: RequestUser, dto: CreateShiftTemplateDto): Promise<ShiftTemplate> {
    return this.templates.save(
      this.templates.create({
        organizationId: user.organizationId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone ?? 'America/Chicago',
        workSiteId: dto.workSiteId ?? null
      })
    );
  }

  async findTemplates(user: RequestUser, query: ListSchedulingQueryDto): Promise<PaginatedResult<ShiftTemplate>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.templates.findAndCount({
      where: { organizationId: user.organizationId, active: true },
      order: { name: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    return paginate(data, total, page, pageSize);
  }

  createInstance(user: RequestUser, dto: CreateShiftInstanceDto): Promise<ShiftInstance> {
    return this.instances.save(
      this.instances.create({
        organizationId: user.organizationId,
        shiftTemplateId: dto.shiftTemplateId ?? null,
        workSiteId: dto.workSiteId ?? null,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt)
      })
    );
  }

  async findInstances(user: RequestUser, query: ListSchedulingQueryDto): Promise<PaginatedResult<ShiftInstance>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.instances.findAndCount({
      where: { organizationId: user.organizationId },
      order: { startAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    return paginate(data, total, page, pageSize);
  }

  async assign(user: RequestUser, dto: CreateShiftAssignmentDto): Promise<ShiftAssignment> {
    const instance = await this.instances.findOne({ where: { id: dto.shiftInstanceId, organizationId: user.organizationId } });
    if (!instance) throw new NotFoundException('Shift instance not found');
    return this.assignments.save(
      this.assignments.create({
        organizationId: user.organizationId,
        employeeMembershipId: dto.employeeMembershipId,
        shiftInstanceId: dto.shiftInstanceId
      })
    );
  }

  async findAssignments(user: RequestUser, query: ListSchedulingQueryDto): Promise<PaginatedResult<ShiftAssignment>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.assignments.findAndCount({
      where: { organizationId: user.organizationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    return paginate(data, total, page, pageSize);
  }

  async resolveShift(organizationId: string, employeeMembershipId: string, at: Date, requestedAssignmentId?: string | null): Promise<{
    assignment: ShiftAssignment | null;
    instance: ShiftInstance | null;
    resolutionType: string;
  }> {
    if (requestedAssignmentId) {
      const assignment = await this.assignments.findOne({
        where: { id: requestedAssignmentId, organizationId, employeeMembershipId, status: ShiftAssignmentStatus.ACTIVE }
      });
      if (assignment) {
        const instance = await this.instances.findOne({
          where: { id: assignment.shiftInstanceId, organizationId, status: ShiftInstanceStatus.SCHEDULED }
        });
        if (instance) return { assignment, instance, resolutionType: 'MATCHED_ALTERNATIVE_ASSIGNED_SHIFT' };
      }
    }

    const windowStart = new Date(at.getTime() - 6 * 60 * 60 * 1000);
    const windowEnd = new Date(at.getTime() + 6 * 60 * 60 * 1000);
    const candidateInstances = await this.instances.find({
      where: { organizationId, status: ShiftInstanceStatus.SCHEDULED, startAt: Between(windowStart, windowEnd) },
      order: { startAt: 'ASC' }
    });
    const instanceIds = candidateInstances.map((instance) => instance.id);
    if (instanceIds.length === 0) return { assignment: null, instance: null, resolutionType: 'UNASSIGNED_CLOCK_IN' };

    const assignments = await this.assignments.find({
      where: { organizationId, employeeMembershipId, status: ShiftAssignmentStatus.ACTIVE }
    });
    const assignment = assignments.find((item) => instanceIds.includes(item.shiftInstanceId));
    const instance = assignment ? candidateInstances.find((item) => item.id === assignment.shiftInstanceId) ?? null : null;
    if (!assignment || !instance) return { assignment: null, instance: null, resolutionType: 'UNASSIGNED_CLOCK_IN' };
    const insideWindow = at >= instance.startAt && at <= instance.endAt;
    return {
      assignment,
      instance,
      resolutionType: insideWindow ? 'MATCHED_ASSIGNED_SHIFT' : 'MATCHED_OUTSIDE_ALLOWED_WINDOW'
    };
  }
}
