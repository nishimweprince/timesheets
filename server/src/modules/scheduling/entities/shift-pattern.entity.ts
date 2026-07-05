import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftPatternFreq {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

@Auditable()
@Entity({ name: 'shift_patterns' })
@Index(['organizationId', 'active'])
export class ShiftPattern extends TenantBaseDomain {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 80, default: 'America/Chicago' })
  timezone: string;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ name: 'work_site_id', type: 'uuid', nullable: true })
  workSiteId: string | null;

  @Column({ name: 'assigned_employee_membership_id', type: 'uuid', nullable: true })
  assignedEmployeeMembershipId: string | null;

  @Column({ type: 'text', nullable: true })
  rrule: string | null;

  @Column({ type: 'enum', enum: ShiftPatternFreq, nullable: true })
  freq: ShiftPatternFreq | null;

  @Column({ name: 'days_of_week', type: 'int', array: true, default: () => "'{}'" })
  daysOfWeek: number[];

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_until', type: 'date', nullable: true })
  effectiveUntil: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
