import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum GeofenceType {
  RADIUS = 'RADIUS',
  POLYGON = 'POLYGON'
}

@Auditable()
@Entity({ name: 'geofences' })
@Index(['organizationId', 'workSiteId'])
export class Geofence extends TenantBaseDomain {
  @Column({ name: 'work_site_id', type: 'uuid' })
  workSiteId: string;

  @Column({ type: 'enum', enum: GeofenceType, default: GeofenceType.RADIUS })
  type: GeofenceType;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  centerPoint: { type: 'Point'; coordinates: [number, number] } | null;

  @Column({ name: 'radius_meters', type: 'integer', nullable: true })
  radiusMeters: number | null;

  @Column({ type: 'jsonb', nullable: true })
  polygon: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
