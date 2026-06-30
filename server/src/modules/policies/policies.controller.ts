import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { CreatePolicyAssignmentDto, CreatePolicyDto, CreateWorkSiteDto } from './dto/policy.dto';
import { PoliciesService } from './policies.service';

@Controller()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get('attendance-policies')
  @Permissions('policy.read')
  findPolicies(@CurrentUser() user: RequestUser) {
    return this.policiesService.findPolicies(user);
  }

  @Post('attendance-policies')
  @Permissions('policy.manage')
  createPolicy(@CurrentUser() user: RequestUser, @Body() dto: CreatePolicyDto) {
    return this.policiesService.createPolicy(user, dto);
  }

  @Post('attendance-policies/assignments')
  @Permissions('policy.manage')
  assign(@CurrentUser() user: RequestUser, @Body() dto: CreatePolicyAssignmentDto) {
    return this.policiesService.assignPolicy(user, dto);
  }

  @Get('work-sites')
  @Permissions('policy.read')
  findWorkSites(@CurrentUser() user: RequestUser) {
    return this.policiesService.findWorkSites(user);
  }

  @Post('work-sites')
  @Permissions('policy.manage')
  createWorkSite(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkSiteDto) {
    return this.policiesService.createWorkSite(user, dto);
  }
}
