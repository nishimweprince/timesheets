import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'membership_roles' })
@Index(['membershipId', 'roleId'], { unique: true })
export class MembershipRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;
}
