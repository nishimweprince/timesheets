import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../audit/auditable.decorator';

export enum PermissionOverrideEffect {
  GRANT = 'GRANT',
  DENY = 'DENY'
}

@Auditable()
@Entity({ name: 'membership_permission_overrides' })
@Index(['membershipId', 'permissionId'], { unique: true })
export class MembershipPermissionOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId: string;

  @Column({ type: 'enum', enum: PermissionOverrideEffect })
  effect: PermissionOverrideEffect;
}
