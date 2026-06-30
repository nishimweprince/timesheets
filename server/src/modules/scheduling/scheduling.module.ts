import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftTemplate } from './entities/shift-template.entity';
import { ShiftInstance } from './entities/shift-instance.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftSwapRequest } from './entities/shift-swap-request.entity';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftTemplate, ShiftInstance, ShiftAssignment, ShiftSwapRequest])],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService]
})
export class SchedulingModule {}
