import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

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
