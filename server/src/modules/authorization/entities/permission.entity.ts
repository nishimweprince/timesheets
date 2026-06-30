import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'permissions' })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  key: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  description: string | null;
}
