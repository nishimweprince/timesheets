import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthenticatedRequest, RequestUser } from '../../common/types/authenticated-request';
import { ClockDto, HistoryQueryDto, OrgSessionsQueryDto } from './dto/attendance.dto';
import { AttendanceEventType } from './entities/attendance-event.entity';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('me/current-session')
  @Permissions('attendance.read.self')
  current(@CurrentUser() user: RequestUser) {
    return this.attendanceService.currentSession(user);
  }

  @Get('me/effective-policy')
  @Permissions('attendance.read.self')
  effectivePolicy(@CurrentUser() user: RequestUser) {
    return this.attendanceService.getEffectivePolicyRules(user);
  }

  @Get('me/history')
  @Permissions('attendance.read.self')
  history(@CurrentUser() user: RequestUser, @Query() query: HistoryQueryDto) {
    return this.attendanceService.history(user, query);
  }

  @Post('me/clock-in')
  @Permissions('attendance.clock_in.self')
  @ResponseMessage('Clocked in successfully')
  clockIn(@CurrentUser() user: RequestUser, @Body() dto: ClockDto, @Req() request: AuthenticatedRequest) {
    return this.attendanceService.clockIn(user, dto, request);
  }

  @Post('me/clock-out')
  @Permissions('attendance.clock_out.self')
  @ResponseMessage('Clocked out successfully')
  clockOut(@CurrentUser() user: RequestUser, @Body() dto: ClockDto, @Req() request: AuthenticatedRequest) {
    return this.attendanceService.clockOut(user, dto, request);
  }

  @Post('me/breaks/start')
  @Permissions('attendance.break.manage.self')
  @ResponseMessage('Break started')
  breakStart(@CurrentUser() user: RequestUser, @Body() dto: ClockDto, @Req() request: AuthenticatedRequest) {
    return this.attendanceService.breakEvent(user, dto, request, AttendanceEventType.BREAK_START);
  }

  @Post('me/breaks/end')
  @Permissions('attendance.break.manage.self')
  @ResponseMessage('Break ended')
  breakEnd(@CurrentUser() user: RequestUser, @Body() dto: ClockDto, @Req() request: AuthenticatedRequest) {
    return this.attendanceService.breakEvent(user, dto, request, AttendanceEventType.BREAK_END);
  }

  @Get('sessions')
  @Permissions('attendance.read.organization')
  sessions(@CurrentUser() user: RequestUser, @Query() query: OrgSessionsQueryDto) {
    return this.attendanceService.sessionsForOrg(user, query);
  }

  @Get('sessions/:id')
  @Permissions('attendance.read.organization')
  session(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attendanceService.sessionsForOrg(user).then((sessions) => sessions.find((session) => session.id === id) ?? null);
  }

  @Get('sessions/:id/detail')
  @Permissions('attendance.read.organization')
  sessionDetail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attendanceService.sessionDetail(user, id);
  }

  @Post('sessions/:id/approve')
  @Permissions('attendance.approve')
  @ResponseMessage('Timesheet approved')
  approveSession(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attendanceService.approveSession(user, id);
  }

  @Post('sessions/:id/reject')
  @Permissions('attendance.approve')
  @ResponseMessage('Timesheet rejected')
  rejectSession(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attendanceService.rejectSession(user, id);
  }

  @Post('sessions/:id/lock')
  @Permissions('attendance.lock')
  @ResponseMessage('Timesheet locked')
  lockSession(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attendanceService.lockSession(user, id);
  }

  @Get('exceptions')
  @Permissions('attendance.read.organization')
  exceptions(@CurrentUser() user: RequestUser) {
    return this.attendanceService.exceptionsForOrg(user);
  }
}
