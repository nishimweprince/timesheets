import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'ip_allowlists' })
@Index(['organizationId', 'cidr'], { unique: true })
export class IpAllowlist extends TenantBaseDomain {
  @Column({ type: 'cidr' })
  cidr: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  label: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
