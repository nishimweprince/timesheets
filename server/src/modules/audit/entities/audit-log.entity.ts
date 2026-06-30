import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditLayer {
  HTTP = 'HTTP',
  ENTITY = 'ENTITY',
  ATTENDANCE = 'ATTENDANCE',
  MEDIA = 'MEDIA'
}

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'correlation_id', type: 'varchar', length: 128, nullable: true })
  correlationId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  action: string;

  @Column({ type: 'enum', enum: AuditLayer })
  layer: AuditLayer;

  @Index()
  @Column({ name: 'entity_type', type: 'varchar', length: 160, nullable: true })
  entityType: string | null;

  @Index()
  @Column({ name: 'entity_id', type: 'varchar', length: 160, nullable: true })
  entityId: string | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  operation: string | null;

  @Column({ name: 'http_method', type: 'varchar', length: 12, nullable: true })
  httpMethod: string | null;

  @Column({ name: 'http_path', type: 'varchar', length: 500, nullable: true })
  httpPath: string | null;

  @Index()
  @Column({ name: 'http_status', type: 'integer', nullable: true })
  httpStatus: number | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ type: 'inet', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ name: 'body_snapshot', type: 'jsonb', nullable: true })
  bodySnapshot: Record<string, unknown> | null;

  @Column({ name: 'query_snapshot', type: 'jsonb', nullable: true })
  querySnapshot: Record<string, unknown> | null;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
