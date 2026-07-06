import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { RequestUser } from "../../common/types/authenticated-request";
import {
  CreateShiftAssignmentDto,
  CreateShiftInstanceDto,
  CreateShiftPatternAssignmentDto,
  CreateShiftPatternDto,
  ListSchedulingQueryDto,
  OverrideShiftInstanceDto,
  ScheduleDateRangeQueryDto,
  UpdateShiftPatternDto,
} from "./dto/scheduling.dto";
import { SchedulingService } from "./scheduling.service";

@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get("my-shifts")
  @Permissions("shift.read")
  findMyPatternShifts(
    @CurrentUser() user: RequestUser,
    @Query() query: ScheduleDateRangeQueryDto,
  ) {
    return this.schedulingService.findMyShifts(user, query);
  }

  @Get("shift-patterns")
  @Permissions("shift.read")
  findPatterns(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSchedulingQueryDto,
  ) {
    return this.schedulingService.findPatterns(user, query);
  }

  @Post("shift-patterns")
  @Permissions("shift.create")
  @ResponseMessage("Shift created")
  createPattern(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateShiftPatternDto,
  ) {
    return this.schedulingService.createPattern(user, dto);
  }

  @Patch("shift-patterns/:id")
  @Permissions("shift.update")
  @ResponseMessage("Shift updated")
  updatePattern(
    @CurrentUser() user: RequestUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShiftPatternDto,
  ) {
    return this.schedulingService.updatePattern(user, id, dto);
  }

  @Delete("shift-patterns/:id")
  @Permissions("shift.update")
  @ResponseMessage("Shift archived")
  archivePattern(
    @CurrentUser() user: RequestUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.schedulingService.archivePattern(user, id);
  }

  @Get("me/shifts")
  @Permissions("shift.read")
  findMyAssignedShifts(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSchedulingQueryDto,
  ) {
    return this.schedulingService.findMyAssignedShifts(user, query);
  }

  @Get("shift-instances")
  @Permissions("shift.read")
  findInstances(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSchedulingQueryDto,
  ) {
    return this.schedulingService.findInstances(user, query);
  }

  @Post("shift-instances")
  @Permissions("shift.create")
  @ResponseMessage("Shift instance created")
  createInstance(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateShiftInstanceDto,
  ) {
    return this.schedulingService.createInstance(user, dto);
  }

  @Patch("shift-instances/:id")
  @Permissions("shift.update")
  @ResponseMessage("Shift instance updated")
  overrideInstance(
    @CurrentUser() user: RequestUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: OverrideShiftInstanceDto,
  ) {
    return this.schedulingService.overrideInstance(user, id, dto);
  }

  @Post("shift-instances/:id/cancel")
  @Permissions("shift.update")
  @ResponseMessage("Shift instance cancelled")
  cancelInstance(
    @CurrentUser() user: RequestUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.schedulingService.cancelInstance(user, id);
  }

  @Post("shift-pattern-assignments")
  @Permissions("shift.assign")
  @ResponseMessage("Shift pattern assigned successfully")
  assignPattern(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateShiftPatternAssignmentDto,
  ) {
    return this.schedulingService.assignPattern(user, dto);
  }

  @Get("shift-assignments")
  @Permissions("shift.read")
  findAssignments(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSchedulingQueryDto,
  ) {
    return this.schedulingService.findAssignments(user, query);
  }

  @Post("shift-assignments")
  @Permissions("shift.assign")
  @ResponseMessage("Shift assigned successfully")
  assign(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateShiftAssignmentDto,
  ) {
    return this.schedulingService.assign(user, dto);
  }
}
