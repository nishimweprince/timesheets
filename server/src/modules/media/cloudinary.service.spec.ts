import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';

const mockUrl = jest.fn();
const mockApiSignRequest = jest.fn();
const mockConfig = jest.fn();
const mockResource = jest.fn();

jest.mock('cloudinary', () => ({
  v2: {
    config: (...args: unknown[]) => mockConfig(...args),
    url: (...args: unknown[]) => mockUrl(...args),
    utils: {
      api_sign_request: (...args: unknown[]) => mockApiSignRequest(...args)
    },
    api: {
      resource: (...args: unknown[]) => mockResource(...args)
    }
  }
}));

function createConfig(values: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
    CLOUDINARY_UPLOAD_FOLDER: 'timesheets/evidence',
    ...values
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = defaults[key];
      if (value === undefined) throw new Error(`Missing ${key}`);
      return value;
    })
  } as unknown as ConfigService;
}

describe('CloudinaryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrl.mockReturnValue('https://res.cloudinary.com/test-cloud/image/upload/s--sig--/v1/timesheets/evidence/asset-id');
    mockApiSignRequest.mockReturnValue('signed');
  });

  describe('signedViewUrl', () => {
    it('generates a signed URL with delivery type upload (matches default upload path)', () => {
      const service = new CloudinaryService(createConfig());
      const url = service.signedViewUrl('asset-public-id');

      expect(mockUrl).toHaveBeenCalledWith(
        'timesheets/evidence/asset-public-id',
        expect.objectContaining({
          resource_type: 'image',
          type: 'upload',
          sign_url: true,
          secure: true
        })
      );
      expect(mockUrl.mock.calls[0][1].type).not.toBe('authenticated');
      expect(mockUrl.mock.calls[0][1].expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(url).toContain('/image/upload/');
    });

    it('throws when Cloudinary is not configured', () => {
      const service = new CloudinaryService(
        createConfig({
          CLOUDINARY_CLOUD_NAME: '',
          CLOUDINARY_API_KEY: '',
          CLOUDINARY_API_SECRET: ''
        })
      );
      expect(() => service.signedViewUrl('id')).toThrow(ServiceUnavailableException);
    });
  });

  describe('signedUploadParams', () => {
    it('targets the public image upload endpoint', () => {
      const service = new CloudinaryService(createConfig());
      const params = service.signedUploadParams('new-id');

      expect(params.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
      expect(params.folder).toBe('timesheets/evidence');
      expect(params.publicId).toBe('new-id');
      expect(mockApiSignRequest).toHaveBeenCalledWith(
        expect.objectContaining({ public_id: 'new-id', folder: 'timesheets/evidence' }),
        'test-secret'
      );
    });
  });
});
