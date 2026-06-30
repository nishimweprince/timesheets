import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'employee_profiles' })
@Index(['organizationId', 'membershipId'], { unique: true })
export class EmployeeProfile extends TenantBaseDomain {
  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ name: 'employee_number', type: 'varchar', length: 80, nullable: true })
  employeeNumber: string | null;

  @Column({ name: 'job_title', type: 'varchar', length: 120, nullable: true })
  jobTitle: string | null;

  @Column({ name: 'manager_membership_id', type: 'uuid', nullable: true })
  managerMembershipId: string | null;

  @Column({ type: 'date', nullable: true })
  hiredAt: string | null;
}
