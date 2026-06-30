import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { PoliciesModule } from '../policies/policies.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { WorkSession } from './entities/work-session.entity';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { ClockAttempt } from './entities/clock-attempt.entity';
import { AttendanceException } from './entities/attendance-exception.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkSession, AttendanceEvent, ClockAttempt, AttendanceException]),
    MediaModule,
    PoliciesModule,
    SchedulingModule
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService]
})
export class AttendanceModule {}
