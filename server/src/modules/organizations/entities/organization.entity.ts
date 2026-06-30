import { Column, Entity, Index } from 'typeorm';
import { BaseDomain } from '../../../common/entities/base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'organizations' })
export class Organization extends BaseDomain {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'default_timezone', type: 'varchar', length: 80, default: 'America/Chicago' })
  defaultTimezone: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
