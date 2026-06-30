import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

@Auditable()
@Entity({ name: 'organization_memberships' })
@Index(['organizationId', 'userId'], { unique: true })
export class OrganizationMembership extends TenantBaseDomain {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @Column({ name: 'primary_work_site_id', type: 'uuid', nullable: true })
  primaryWorkSiteId: string | null;
}
