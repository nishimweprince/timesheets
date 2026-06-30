import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { RequestUser } from '../../common/types/authenticated-request';
import { AuditLayer } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { MediaAsset, MediaAssetStatus } from './entities/media-asset.entity';
import { CloudinaryService } from './cloudinary.service';
import { UploadAuthorizationDto } from './dto/media.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset) private readonly mediaAssets: Repository<MediaAsset>,
    private readonly cloudinary: CloudinaryService,
    private readonly auditService: AuditService
  ) {}

  async createUploadAuthorization(user: RequestUser, dto: UploadAuthorizationDto) {
    const publicId = uuid();
    const asset = await this.mediaAssets.save(
      this.mediaAssets.create({
        organizationId: user.organizationId,
        employeeMembershipId: user.membershipId,
        publicId,
        originalFilename: dto.originalFilename ?? null,
        status: MediaAssetStatus.PENDING_UPLOAD
      })
    );
    return { mediaAssetId: asset.id, cloudinary: this.cloudinary.signedUploadParams(publicId) };
  }

  async complete(user: RequestUser, id: string, publicId: string): Promise<MediaAsset> {
    const asset = await this.findOwned(user, id);
    if (asset.publicId !== publicId) throw new ForbiddenException('Cloudinary public id mismatch');
    const resource = await this.cloudinary.getImage(publicId);
    asset.assetId = resource.assetId;
    asset.mimeType = `image/${resource.format}`;
    asset.sizeBytes = resource.bytes;
    asset.width = resource.width;
    asset.height = resource.height;
    asset.status = MediaAssetStatus.VERIFIED;
    asset.uploadedAt = new Date();
    asset.validatedAt = new Date();
    return this.mediaAssets.save(asset);
  }

  async findForClock(organizationId: string, membershipId: string, id: string): Promise<MediaAsset> {
    const asset = await this.mediaAssets.findOne({ where: { id, organizationId, employeeMembershipId: membershipId } });
    if (!asset) throw new NotFoundException('Media asset not found');
    if (asset.status !== MediaAssetStatus.VERIFIED) throw new ForbiddenException('Media asset is not verified');
    return asset;
  }

  async findOwned(user: RequestUser, id: string): Promise<MediaAsset> {
    const asset = await this.mediaAssets.findOne({ where: { id, organizationId: user.organizationId } });
    if (!asset) throw new NotFoundException('Media asset not found');
    if (asset.employeeMembershipId !== user.membershipId && !user.permissions.includes('media.read.organization')) {
      throw new ForbiddenException('Cannot access this media asset');
    }
    return asset;
  }

  async viewUrl(user: RequestUser, id: string): Promise<{ signedUrl: string; expiresInSeconds: number }> {
    const asset = await this.findOwned(user, id);
    await this.auditService.record({
      action: 'media.view',
      layer: AuditLayer.MEDIA,
      organizationId: user.organizationId,
      actorId: user.userId,
      entityType: 'MediaAsset',
      entityId: asset.id,
      metadata: { publicId: asset.publicId }
    });
    return { signedUrl: this.cloudinary.signedViewUrl(asset.publicId), expiresInSeconds: 300 };
  }
}
