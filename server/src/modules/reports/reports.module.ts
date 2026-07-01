import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceException } from '../attendance/entities/attendance-exception.entity';
import { WorkSession } from '../attendance/entities/work-session.entity';
import { EmployeeProfile } from '../organizations/entities/employee-profile.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { User } from '../organizations/entities/user.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSession, AttendanceException, OrganizationMembership, User, EmployeeProfile])],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
