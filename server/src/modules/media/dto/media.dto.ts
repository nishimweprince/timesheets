import { IsOptional, IsString } from 'class-validator';

export class UploadAuthorizationDto {
  @IsOptional()
  @IsString()
  originalFilename?: string;
}

export class CompleteUploadDto {
  @IsString()
  publicId: string;
}
