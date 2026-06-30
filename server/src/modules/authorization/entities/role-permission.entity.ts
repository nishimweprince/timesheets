import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'role_permissions' })
@Index(['roleId', 'permissionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId: string;
}
