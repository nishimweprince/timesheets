import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftPattern } from './entities/shift-pattern.entity';
import { ShiftInstance } from './entities/shift-instance.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftPatternAssignment } from './entities/shift-pattern-assignment.entity';
import { ShiftSwapRequest } from './entities/shift-swap-request.entity';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { SchedulingMaterializer } from './scheduling.materializer';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftPattern, ShiftInstance, ShiftAssignment, ShiftPatternAssignment, ShiftSwapRequest])],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingMaterializer],
  exports: [SchedulingService]
})
export class SchedulingModule {}
