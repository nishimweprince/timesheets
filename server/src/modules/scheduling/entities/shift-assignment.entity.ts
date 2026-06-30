import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftAssignmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  REASSIGNED = 'REASSIGNED'
}

@Auditable()
@Entity({ name: 'shift_assignments' })
@Index(['organizationId', 'employeeMembershipId', 'shiftInstanceId'])
export class ShiftAssignment extends TenantBaseDomain {
  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ name: 'shift_instance_id', type: 'uuid' })
  shiftInstanceId: string;

  @Column({ type: 'enum', enum: ShiftAssignmentStatus, default: ShiftAssignmentStatus.ACTIVE })
  status: ShiftAssignmentStatus;
}
