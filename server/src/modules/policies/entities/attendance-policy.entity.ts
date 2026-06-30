import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum PolicyEnforcement {
  ALLOW = 'ALLOW',
  FLAG = 'FLAG',
  REQUIRE_REASON = 'REQUIRE_REASON',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  BLOCK = 'BLOCK'
}

export interface AttendancePolicyRules {
  requireClockInPhoto: boolean;
  requireClockOutPhoto: boolean;
  requireLocation: boolean;
  unplannedClockIn: PolicyEnforcement;
  outsideGeofence: PolicyEnforcement;
  earlyClockInGraceMinutes: number;
  lateClockInGraceMinutes: number;
  maxShiftMinutes: number;
}

@Auditable()
@Entity({ name: 'attendance_policies' })
@Index(['organizationId', 'name'], { unique: true })
export class AttendancePolicy extends TenantBaseDomain {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb' })
  rules: AttendancePolicyRules;
}
