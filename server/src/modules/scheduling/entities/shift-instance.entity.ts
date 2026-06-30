import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftInstanceStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED'
}

@Auditable()
@Entity({ name: 'shift_instances' })
@Index(['organizationId', 'startAt', 'endAt'])
export class ShiftInstance extends TenantBaseDomain {
  @Column({ name: 'shift_template_id', type: 'uuid', nullable: true })
  shiftTemplateId: string | null;

  @Column({ name: 'work_site_id', type: 'uuid', nullable: true })
  workSiteId: string | null;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'enum', enum: ShiftInstanceStatus, default: ShiftInstanceStatus.SCHEDULED })
  status: ShiftInstanceStatus;
}
