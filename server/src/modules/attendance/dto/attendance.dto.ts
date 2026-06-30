import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracyMeters?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @IsOptional()
  @IsString()
  permissionState?: string;
}

export class ClockDto {
  @IsOptional()
  @IsUUID()
  requestedShiftAssignmentId?: string;

  @IsOptional()
  @IsDateString()
  clientReportedAt?: string;

  @IsOptional()
  @IsString()
  clientTimezone?: string;

  @IsOptional()
  @IsNumber()
  clientUtcOffsetMinutes?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsObject()
  device?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  cameraEvidenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
