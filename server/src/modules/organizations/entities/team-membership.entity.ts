import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'team_memberships' })
@Index(['organizationId', 'teamId', 'membershipId'], { unique: true })
export class TeamMembership extends TenantBaseDomain {
  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;
}
