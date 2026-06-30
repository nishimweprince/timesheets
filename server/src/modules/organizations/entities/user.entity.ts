import { Column, Entity, Index } from 'typeorm';
import { BaseDomain } from '../../../common/entities/base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'users' })
export class User extends BaseDomain {
  @Index({ unique: true })
  @Column({ type: 'citext' })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
