import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'shift_templates' })
@Index(['organizationId', 'name'], { unique: true })
export class ShiftTemplate extends TenantBaseDomain {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 80, default: 'America/Chicago' })
  timezone: string;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ name: 'work_site_id', type: 'uuid', nullable: true })
  workSiteId: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
