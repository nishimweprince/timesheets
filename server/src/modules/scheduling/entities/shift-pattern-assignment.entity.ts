import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftPatternAssignmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED'
}

@Auditable()
@Entity({ name: 'shift_pattern_assignments' })
@Index(['organizationId', 'shiftPatternId'])
@Index(['organizationId', 'employeeMembershipId'])
@Unique('uq_shift_pattern_assignment_employee', ['organizationId', 'shiftPatternId', 'employeeMembershipId'])
export class ShiftPatternAssignment extends TenantBaseDomain {
  @Column({ name: 'shift_pattern_id', type: 'uuid' })
  shiftPatternId: string;

  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ type: 'enum', enum: ShiftPatternAssignmentStatus, default: ShiftPatternAssignmentStatus.ACTIVE })
  status: ShiftPatternAssignmentStatus;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: string | null;

  @Column({ name: 'effective_until', type: 'date', nullable: true })
  effectiveUntil: string | null;
}
