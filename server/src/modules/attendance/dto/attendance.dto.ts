import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsLatitude, IsLongitude, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const HISTORY_STATUS_GROUPS = ['Approved', 'Pending', 'Draft'] as const;
export type HistoryStatusGroup = (typeof HISTORY_STATUS_GROUPS)[number];

export class HistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(HISTORY_STATUS_GROUPS)
  status?: HistoryStatusGroup;
}

export class LocationDto {
  @IsLatitude()
  @IsNumber()
  latitude: number;

  @IsLongitude()
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
  @IsUUID()
  requestedShiftInstanceId?: string;

  @IsOptional()
  @IsUUID()
  requestedShiftPatternAssignmentId?: string;

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
