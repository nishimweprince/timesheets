import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum PolicyAssignmentScope {
  ORGANIZATION = 'ORGANIZATION',
  WORK_SITE = 'WORK_SITE',
  TEAM = 'TEAM',
  SHIFT_TEMPLATE = 'SHIFT_TEMPLATE',
  EMPLOYEE = 'EMPLOYEE'
}

@Auditable()
@Entity({ name: 'attendance_policy_assignments' })
@Index(['organizationId', 'scope', 'scopeId'])
export class AttendancePolicyAssignment extends TenantBaseDomain {
  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @Column({ type: 'enum', enum: PolicyAssignmentScope })
  scope: PolicyAssignmentScope;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
