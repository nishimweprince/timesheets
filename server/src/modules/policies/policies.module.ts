import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSite } from './entities/work-site.entity';
import { Geofence } from './entities/geofence.entity';
import { IpAllowlist } from './entities/ip-allowlist.entity';
import { AttendancePolicy } from './entities/attendance-policy.entity';
import { AttendancePolicyAssignment } from './entities/attendance-policy-assignment.entity';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSite, Geofence, IpAllowlist, AttendancePolicy, AttendancePolicyAssignment])],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService]
})
export class PoliciesModule {}
