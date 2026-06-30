import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListSchedulingQueryDto extends PaginationQueryDto {}

export class CreateShiftTemplateDto {
  @IsString()
  name: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsUUID()
  workSiteId?: string;
}

export class CreateShiftInstanceDto {
  @IsOptional()
  @IsUUID()
  shiftTemplateId?: string;

  @IsOptional()
  @IsUUID()
  workSiteId?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}

export class CreateShiftAssignmentDto {
  @IsUUID()
  employeeMembershipId: string;

  @IsUUID()
  shiftInstanceId: string;
}
