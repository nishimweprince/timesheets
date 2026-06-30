import { ArrayUnique, IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MembershipStatus } from '../entities/organization-membership.entity';

export class ListEmployeesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}

export class ListTeamsQueryDto extends PaginationQueryDto {}

export class InviteEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  teamIds?: string[];

  @IsOptional()
  @IsString()
  roleName?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  employeeNumber?: string | null;

  @IsOptional()
  @IsString()
  jobTitle?: string | null;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string | null;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  teamIds?: string[];

  @IsOptional()
  @IsString()
  roleName?: string;
}

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string | null;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string | null;
}

export class AcceptEmployeeInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
