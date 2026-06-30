import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum MediaAssetStatus {
  PENDING_UPLOAD = 'PENDING_UPLOAD',
  UPLOADED = 'UPLOADED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  QUARANTINED = 'QUARANTINED',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED'
}

@Auditable()
@Entity({ name: 'media_assets' })
export class MediaAsset extends TenantBaseDomain {
  @Index()
  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ name: 'storage_provider', type: 'varchar', length: 40, default: 'cloudinary' })
  storageProvider: string;

  @Index()
  @Column({ name: 'public_id', type: 'varchar', length: 300 })
  publicId: string;

  @Column({ name: 'asset_id', type: 'varchar', length: 120, nullable: true })
  assetId: string | null;

  @Column({ name: 'resource_type', type: 'varchar', length: 40, default: 'image' })
  resourceType: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'integer', nullable: true })
  sizeBytes: number | null;

  @Column({ name: 'sha256_hash', type: 'varchar', length: 128, nullable: true })
  sha256Hash: string | null;

  @Column({ type: 'integer', nullable: true })
  width: number | null;

  @Column({ type: 'integer', nullable: true })
  height: number | null;

  @Column({ type: 'enum', enum: MediaAssetStatus, default: MediaAssetStatus.PENDING_UPLOAD })
  status: MediaAssetStatus;

  @Column({ name: 'uploaded_at', type: 'timestamptz', nullable: true })
  uploadedAt: Date | null;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
