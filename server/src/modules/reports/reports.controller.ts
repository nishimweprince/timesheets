import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { ExceptionsReportQueryDto, HoursByEmployeeQueryDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('hours-by-employee')
  @Permissions('report.read')
  hoursByEmployee(@CurrentUser() user: RequestUser, @Query() query: HoursByEmployeeQueryDto) {
    return this.reportsService.hoursByEmployee(user, query);
  }

  @Get('exceptions')
  @Permissions('report.read')
  exceptions(@CurrentUser() user: RequestUser, @Query() query: ExceptionsReportQueryDto) {
    return this.reportsService.exceptionsReport(user, query);
  }
}
