import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftInstanceStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  MODIFIED = 'MODIFIED',
  COMPLETED = 'COMPLETED'
}

@Auditable()
@Entity({ name: 'shift_instances' })
@Index(['organizationId', 'startAt', 'endAt'])
@Index(['organizationId', 'shiftDate'])
@Unique('uq_shift_instance_pattern_date', ['patternId', 'shiftDate'])
export class ShiftInstance extends TenantBaseDomain {
  @Column({ name: 'pattern_id', type: 'uuid', nullable: true })
  patternId: string | null;

  @Column({ name: 'work_site_id', type: 'uuid', nullable: true })
  workSiteId: string | null;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'enum', enum: ShiftInstanceStatus, default: ShiftInstanceStatus.SCHEDULED })
  status: ShiftInstanceStatus;
}
