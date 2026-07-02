import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ShiftPatternFreq } from '../entities/shift-pattern.entity';
import { ShiftInstanceStatus } from '../entities/shift-instance.entity';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ListSchedulingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  patternId?: string;
}

export class CreateShiftPatternDto {
  @IsString()
  name: string;

  @Matches(HHMM, { message: 'startTime must be HH:MM' })
  startTime: string;

  @Matches(HHMM, { message: 'endTime must be HH:MM' })
  endTime: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsUUID()
  workSiteId?: string;

  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek: number[];

  @IsOptional()
  @IsEnum(ShiftPatternFreq)
  freq?: ShiftPatternFreq;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}

export class UpdateShiftPatternDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Matches(HHMM, { message: 'startTime must be HH:MM' })
  startTime?: string;

  @IsOptional()
  @Matches(HHMM, { message: 'endTime must be HH:MM' })
  endTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsUUID()
  workSiteId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsEnum(ShiftPatternFreq)
  freq?: ShiftPatternFreq;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateShiftInstanceDto {
  @IsOptional()
  @IsUUID()
  patternId?: string;

  @IsOptional()
  @IsUUID()
  workSiteId?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}

export class OverrideShiftInstanceDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(ShiftInstanceStatus)
  status?: ShiftInstanceStatus;
}

export class CreateShiftAssignmentDto {
  @IsUUID()
  employeeMembershipId: string;

  @IsUUID()
  shiftInstanceId: string;
}
