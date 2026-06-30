import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { AcceptEmployeeInvitationDto, CreateTeamDto, InviteEmployeeDto, UpdateEmployeeDto, UpdateTeamDto } from './dto/employee-management.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @Permissions('organization.read')
  current(@CurrentUser() user: RequestUser) {
    return this.organizationsService.currentOrganization(user);
  }
}

@Controller('employees')
export class EmployeesController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Permissions('employee.read')
  findEmployees(@CurrentUser() user: RequestUser) {
    return this.organizationsService.listEmployees(user);
  }

  @Post('invite')
  @Permissions('employee.manage')
  @ResponseMessage('Employee invited')
  inviteEmployee(@CurrentUser() user: RequestUser, @Body() dto: InviteEmployeeDto) {
    return this.organizationsService.inviteEmployee(user, dto);
  }

  @Patch(':membershipId')
  @Permissions('employee.manage')
  @ResponseMessage('Employee updated')
  updateEmployee(
    @CurrentUser() user: RequestUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateEmployeeDto
  ) {
    return this.organizationsService.updateEmployee(user, membershipId, dto);
  }

  @Post(':membershipId/resend-invite')
  @Permissions('employee.manage')
  @ResponseMessage('Invitation resent')
  resendInvitation(@CurrentUser() user: RequestUser, @Param('membershipId') membershipId: string) {
    return this.organizationsService.resendInvitation(user, membershipId);
  }
}

@Controller('teams')
export class TeamsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Permissions('employee.read')
  findTeams(@CurrentUser() user: RequestUser) {
    return this.organizationsService.listTeams(user);
  }

  @Post()
  @Permissions('employee.manage')
  @ResponseMessage('Team created')
  createTeam(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamDto) {
    return this.organizationsService.createTeam(user, dto);
  }

  @Patch(':teamId')
  @Permissions('employee.manage')
  @ResponseMessage('Team updated')
  updateTeam(@CurrentUser() user: RequestUser, @Param('teamId') teamId: string, @Body() dto: UpdateTeamDto) {
    return this.organizationsService.updateTeam(user, teamId, dto);
  }
}

@Controller('employee-invitations')
export class EmployeeInvitationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Public()
  @Get('preview')
  preview(@Query('token') token: string) {
    return this.organizationsService.previewInvitation(token);
  }

  @Public()
  @Post('accept')
  @ResponseMessage('Invitation accepted')
  accept(@Body() dto: AcceptEmployeeInvitationDto) {
    return this.organizationsService.acceptInvitation(dto);
  }
}
