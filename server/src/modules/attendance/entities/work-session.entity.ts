import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum WorkSessionStatus {
  OPEN = 'OPEN',
  CLOCKED_OUT = 'CLOCKED_OUT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED'
}

export enum ShiftResolutionType {
  MATCHED_ASSIGNED_SHIFT = 'MATCHED_ASSIGNED_SHIFT',
  MATCHED_OUTSIDE_ALLOWED_WINDOW = 'MATCHED_OUTSIDE_ALLOWED_WINDOW',
  MATCHED_ALTERNATIVE_ASSIGNED_SHIFT = 'MATCHED_ALTERNATIVE_ASSIGNED_SHIFT',
  UNASSIGNED_CLOCK_IN = 'UNASSIGNED_CLOCK_IN',
  SHIFT_SWAP_APPLIED = 'SHIFT_SWAP_APPLIED',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE'
}

@Auditable()
@Entity({ name: 'work_sessions' })
@Index(['organizationId', 'employeeMembershipId', 'actualClockInAt'])
export class WorkSession extends TenantBaseDomain {
  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ name: 'planned_shift_instance_id', type: 'uuid', nullable: true })
  plannedShiftInstanceId: string | null;

  @Column({ name: 'planned_shift_assignment_id', type: 'uuid', nullable: true })
  plannedShiftAssignmentId: string | null;

  @Column({ name: 'planned_shift_pattern_id', type: 'uuid', nullable: true })
  plannedShiftPatternId: string | null;

  @Column({ name: 'planned_shift_pattern_assignment_id', type: 'uuid', nullable: true })
  plannedShiftPatternAssignmentId: string | null;

  @Column({ type: 'enum', enum: WorkSessionStatus, default: WorkSessionStatus.OPEN })
  status: WorkSessionStatus;

  @Column({ name: 'resolution_type', type: 'enum', enum: ShiftResolutionType })
  resolutionType: ShiftResolutionType;

  @Column({ name: 'review_status', type: 'varchar', length: 80, default: 'NOT_REQUIRED' })
  reviewStatus: string;

  @Column({ name: 'actual_clock_in_at', type: 'timestamptz' })
  actualClockInAt: Date;

  @Column({ name: 'actual_clock_out_at', type: 'timestamptz', nullable: true })
  actualClockOutAt: Date | null;

  @Column({ name: 'gross_minutes', type: 'integer', nullable: true })
  grossMinutes: number | null;

  @Column({ name: 'break_minutes', type: 'integer', nullable: true })
  breakMinutes: number | null;

  @Column({ name: 'net_minutes', type: 'integer', nullable: true })
  netMinutes: number | null;

  @Column({ name: 'clock_in_event_id', type: 'uuid', nullable: true })
  clockInEventId: string | null;

  @Column({ name: 'clock_out_event_id', type: 'uuid', nullable: true })
  clockOutEventId: string | null;

  @Column({ name: 'policy_snapshot', type: 'jsonb' })
  policySnapshot: Record<string, unknown>;

  @Column({ name: 'policy_result', type: 'jsonb' })
  policyResult: Record<string, unknown>;

  @Column({ name: 'has_exceptions', type: 'boolean', default: false })
  hasExceptions: boolean;

  @Column({ name: 'exception_count', type: 'integer', default: 0 })
  exceptionCount: number;
}
