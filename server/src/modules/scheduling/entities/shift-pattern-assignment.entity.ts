import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftPatternAssignmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  ENDED = 'ENDED'
}

@Auditable()
@Entity({ name: 'shift_pattern_assignments' })
@Index(['organizationId', 'employeeMembershipId', 'patternId'])
export class ShiftPatternAssignment extends TenantBaseDomain {
  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ name: 'pattern_id', type: 'uuid' })
  patternId: string;

  @Column({ type: 'enum', enum: ShiftPatternAssignmentStatus, default: ShiftPatternAssignmentStatus.ACTIVE })
  status: ShiftPatternAssignmentStatus;
}
