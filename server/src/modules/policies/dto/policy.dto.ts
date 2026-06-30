import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyAssignmentScope } from '../entities/attendance-policy-assignment.entity';
import { PolicyEnforcement } from '../entities/attendance-policy.entity';

export class PolicyRulesDto {
  @IsBoolean()
  requireClockInPhoto: boolean;

  @IsBoolean()
  requireClockOutPhoto: boolean;

  @IsBoolean()
  requireLocation: boolean;

  @IsEnum(PolicyEnforcement)
  unplannedClockIn: PolicyEnforcement;

  @IsEnum(PolicyEnforcement)
  outsideGeofence: PolicyEnforcement;

  @IsNumber()
  earlyClockInGraceMinutes: number;

  @IsNumber()
  lateClockInGraceMinutes: number;

  @IsNumber()
  maxShiftMinutes: number;
}

export class CreatePolicyDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => PolicyRulesDto)
  rules: PolicyRulesDto;
}

export class CreatePolicyAssignmentDto {
  @IsUUID()
  policyId: string;

  @IsEnum(PolicyAssignmentScope)
  scope: PolicyAssignmentScope;

  @IsOptional()
  @IsUUID()
  scopeId?: string;
}

export class CreateWorkSiteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
