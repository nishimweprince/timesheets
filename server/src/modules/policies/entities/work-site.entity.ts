import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'work_sites' })
@Index(['organizationId', 'name'], { unique: true })
export class WorkSite extends TenantBaseDomain {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 80, default: 'America/Chicago' })
  timezone: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  locationPoint: { type: 'Point'; coordinates: [number, number] } | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
