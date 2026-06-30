import { Column, Index, VersionColumn } from 'typeorm';
import { BaseDomain } from './base-domain.entity';

export abstract class TenantBaseDomain extends BaseDomain {
  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @VersionColumn({ name: 'version', default: 1 })
  version: number;
}
