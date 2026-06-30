import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true
    });
  }

  signedUploadParams(publicId: string): Record<string, string | number> {
    this.ensureConfigured();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = this.config.getOrThrow<string>('CLOUDINARY_UPLOAD_FOLDER');
    const signature = cloudinary.utils.api_sign_request(
      {
        public_id: publicId,
        folder,
        timestamp,
        resource_type: 'image'
      },
      this.config.getOrThrow<string>('CLOUDINARY_API_SECRET')
    );

    return {
      apiKey: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      cloudName: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      folder,
      publicId,
      timestamp,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME')}/image/upload`
    };
  }

  async getImage(publicId: string): Promise<{
    assetId: string;
    bytes: number;
    format: string;
    width: number;
    height: number;
    secureUrl: string;
  }> {
    this.ensureConfigured();
    const folder = this.config.getOrThrow<string>('CLOUDINARY_UPLOAD_FOLDER');
    const resource = await cloudinary.api.resource(`${folder}/${publicId}`, { resource_type: 'image' });
    return {
      assetId: String(resource.asset_id),
      bytes: Number(resource.bytes),
      format: String(resource.format),
      width: Number(resource.width),
      height: Number(resource.height),
      secureUrl: String(resource.secure_url)
    };
  }

  signedViewUrl(publicId: string): string {
    this.ensureConfigured();
    const folder = this.config.getOrThrow<string>('CLOUDINARY_UPLOAD_FOLDER');
    return cloudinary.url(`${folder}/${publicId}`, {
      resource_type: 'image',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 300
    });
  }

  private ensureConfigured(): void {
    if (!this.config.get<string>('CLOUDINARY_CLOUD_NAME') || !this.config.get<string>('CLOUDINARY_API_KEY') || !this.config.get<string>('CLOUDINARY_API_SECRET')) {
      throw new ServiceUnavailableException('Cloudinary is not configured');
    }
  }
}
