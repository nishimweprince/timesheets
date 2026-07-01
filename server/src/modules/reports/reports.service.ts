import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult, paginate } from '../../common/types/paginated-result';
import { RequestUser } from '../../common/types/authenticated-request';
import { EmployeeProfile } from '../organizations/entities/employee-profile.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { User } from '../organizations/entities/user.entity';
import { AttendanceException } from '../attendance/entities/attendance-exception.entity';
import { WorkSession } from '../attendance/entities/work-session.entity';
import { ExceptionsReportQueryDto, HoursByEmployeeQueryDto } from './dto/reports.dto';

export interface HoursByEmployeeRow {
  membershipId: string;
  firstName: string | null;
  lastName: string | null;
  employeeNumber: string | null;
  jobTitle: string | null;
  sessionCount: number;
  netMinutes: number;
  grossMinutes: number;
  breakMinutes: number;
  exceptionCount: number;
}

export interface ExceptionReportRow {
  id: string;
  membershipId: string;
  firstName: string | null;
  lastName: string | null;
  workSessionId: string | null;
  code: string;
  severity: string;
  message: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(WorkSession) private readonly sessions: Repository<WorkSession>,
    @InjectRepository(AttendanceException) private readonly exceptions: Repository<AttendanceException>
  ) {}

  async hoursByEmployee(user: RequestUser, query: HoursByEmployeeQueryDto): Promise<PaginatedResult<HoursByEmployeeRow>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    this.assertValidRange(query.startDate, query.endDate);

    const baseQb = this.sessions
      .createQueryBuilder('session')
      .where('session.organizationId = :organizationId', { organizationId: user.organizationId });
    this.applyDateRange(baseQb, 'session.actualClockInAt', query.startDate, query.endDate);

    const countRow = await baseQb
      .clone()
      .select('COUNT(DISTINCT session.employeeMembershipId)', 'count')
      .getRawOne<{ count: string }>();
    const total = Number(countRow?.count ?? 0);

    const rows = await baseQb
      .clone()
      .leftJoin(OrganizationMembership, 'membership', 'membership.id = session.employeeMembershipId')
      .leftJoin(User, 'employeeUser', 'employeeUser.id = membership.userId')
      .leftJoin(EmployeeProfile, 'profile', 'profile.membershipId = membership.id AND profile.organizationId = session.organizationId')
      .select('session.employeeMembershipId', 'membershipId')
      .addSelect('employeeUser.firstName', 'firstName')
      .addSelect('employeeUser.lastName', 'lastName')
      .addSelect('profile.employeeNumber', 'employeeNumber')
      .addSelect('profile.jobTitle', 'jobTitle')
      .addSelect('COUNT(session.id)', 'sessionCount')
      .addSelect('COALESCE(SUM(session.netMinutes), 0)', 'netMinutes')
      .addSelect('COALESCE(SUM(session.grossMinutes), 0)', 'grossMinutes')
      .addSelect('COALESCE(SUM(session.breakMinutes), 0)', 'breakMinutes')
      .addSelect('COALESCE(SUM(session.exceptionCount), 0)', 'exceptionCount')
      .groupBy('session.employeeMembershipId')
      .addGroupBy('employeeUser.firstName')
      .addGroupBy('employeeUser.lastName')
      .addGroupBy('profile.employeeNumber')
      .addGroupBy('profile.jobTitle')
      .orderBy('COALESCE(SUM(session.netMinutes), 0)', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<Record<string, string | null>>();

    const data: HoursByEmployeeRow[] = rows.map((row) => ({
      membershipId: row.membershipId as string,
      firstName: row.firstName,
      lastName: row.lastName,
      employeeNumber: row.employeeNumber,
      jobTitle: row.jobTitle,
      sessionCount: Number(row.sessionCount ?? 0),
      netMinutes: Number(row.netMinutes ?? 0),
      grossMinutes: Number(row.grossMinutes ?? 0),
      breakMinutes: Number(row.breakMinutes ?? 0),
      exceptionCount: Number(row.exceptionCount ?? 0)
    }));

    return paginate(data, total, page, pageSize);
  }

  async exceptionsReport(user: RequestUser, query: ExceptionsReportQueryDto): Promise<PaginatedResult<ExceptionReportRow>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    this.assertValidRange(query.startDate, query.endDate);

    const baseQb = this.exceptions
      .createQueryBuilder('exception')
      .where('exception.organizationId = :organizationId', { organizationId: user.organizationId });
    this.applyDateRange(baseQb, 'exception.createdAt', query.startDate, query.endDate);
    if (query.severity?.trim()) baseQb.andWhere('exception.severity = :severity', { severity: query.severity.trim() });
    if (query.status?.trim()) baseQb.andWhere('exception.status = :status', { status: query.status.trim() });

    const total = await baseQb.clone().getCount();

    const rows = await baseQb
      .clone()
      .leftJoin(OrganizationMembership, 'membership', 'membership.id = exception.employeeMembershipId')
      .leftJoin(User, 'employeeUser', 'employeeUser.id = membership.userId')
      .select('exception.id', 'id')
      .addSelect('exception.employeeMembershipId', 'membershipId')
      .addSelect('employeeUser.firstName', 'firstName')
      .addSelect('employeeUser.lastName', 'lastName')
      .addSelect('exception.workSessionId', 'workSessionId')
      .addSelect('exception.code', 'code')
      .addSelect('exception.severity', 'severity')
      .addSelect('exception.message', 'message')
      .addSelect('exception.status', 'status')
      .addSelect('exception.createdAt', 'createdAt')
      .orderBy('exception.createdAt', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<Record<string, unknown>>();

    const data: ExceptionReportRow[] = rows.map((row) => ({
      id: row.id as string,
      membershipId: row.membershipId as string,
      firstName: (row.firstName as string | null) ?? null,
      lastName: (row.lastName as string | null) ?? null,
      workSessionId: (row.workSessionId as string | null) ?? null,
      code: row.code as string,
      severity: row.severity as string,
      message: row.message as string,
      status: row.status as string,
      createdAt: row.createdAt as Date
    }));

    return paginate(data, total, page, pageSize);
  }

  private applyDateRange(qb: SelectQueryBuilder<ObjectLiteral>, column: string, startDate?: string, endDate?: string): void {
    if (startDate) qb.andWhere(`${column} >= :startDate`, { startDate });
    if (endDate) qb.andWhere(`${column} <= :endDate`, { endDate });
  }

  private assertValidRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new BadRequestException('startDate must be before endDate');
    }
  }
}
