import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'teams' })
@Index(['organizationId', 'name'], { unique: true })
export class Team extends TenantBaseDomain {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'manager_membership_id', type: 'uuid', nullable: true })
  managerMembershipId: string | null;
}
