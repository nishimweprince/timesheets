import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { CreateShiftAssignmentDto, CreateShiftInstanceDto, CreateShiftTemplateDto } from './dto/scheduling.dto';
import { SchedulingService } from './scheduling.service';

@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('shift-templates')
  @Permissions('shift.read')
  findTemplates(@CurrentUser() user: RequestUser) {
    return this.schedulingService.findTemplates(user);
  }

  @Post('shift-templates')
  @Permissions('shift.create')
  createTemplate(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftTemplateDto) {
    return this.schedulingService.createTemplate(user, dto);
  }

  @Get('shift-instances')
  @Permissions('shift.read')
  findInstances(@CurrentUser() user: RequestUser) {
    return this.schedulingService.findInstances(user);
  }

  @Post('shift-instances')
  @Permissions('shift.create')
  createInstance(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftInstanceDto) {
    return this.schedulingService.createInstance(user, dto);
  }

  @Get('shift-assignments')
  @Permissions('shift.read')
  findAssignments(@CurrentUser() user: RequestUser) {
    return this.schedulingService.findAssignments(user);
  }

  @Post('shift-assignments')
  @Permissions('shift.assign')
  assign(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftAssignmentDto) {
    return this.schedulingService.assign(user, dto);
  }
}
