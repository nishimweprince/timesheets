import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { CreateShiftAssignmentDto, CreateShiftInstanceDto, CreateShiftTemplateDto, ListSchedulingQueryDto } from './dto/scheduling.dto';
import { SchedulingService } from './scheduling.service';

@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('shift-templates')
  @Permissions('shift.read')
  findTemplates(@CurrentUser() user: RequestUser, @Query() query: ListSchedulingQueryDto) {
    return this.schedulingService.findTemplates(user, query);
  }

  @Post('shift-templates')
  @Permissions('shift.create')
  @ResponseMessage('Shift template created')
  createTemplate(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftTemplateDto) {
    return this.schedulingService.createTemplate(user, dto);
  }

  @Get('shift-instances')
  @Permissions('shift.read')
  findInstances(@CurrentUser() user: RequestUser, @Query() query: ListSchedulingQueryDto) {
    return this.schedulingService.findInstances(user, query);
  }

  @Post('shift-instances')
  @Permissions('shift.create')
  @ResponseMessage('Shift created')
  createInstance(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftInstanceDto) {
    return this.schedulingService.createInstance(user, dto);
  }

  @Get('shift-assignments')
  @Permissions('shift.read')
  findAssignments(@CurrentUser() user: RequestUser, @Query() query: ListSchedulingQueryDto) {
    return this.schedulingService.findAssignments(user, query);
  }

  @Post('shift-assignments')
  @Permissions('shift.assign')
  @ResponseMessage('Shift assigned successfully')
  assign(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftAssignmentDto) {
    return this.schedulingService.assign(user, dto);
  }
}
