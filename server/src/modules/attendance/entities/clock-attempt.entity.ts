import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ClockAttemptResult {
  ACCEPTED = 'ACCEPTED',
  ACCEPTED_WITH_FLAGS = 'ACCEPTED_WITH_FLAGS',
  BLOCKED = 'BLOCKED',
  DUPLICATE = 'DUPLICATE',
  FAILED = 'FAILED'
}

@Entity({ name: 'clock_attempts' })
@Index(['organizationId', 'employeeMembershipId', 'receivedAt'])
export class ClockAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ type: 'varchar', length: 40 })
  action: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  idempotencyKey: string;

  @Column({ name: 'correlation_id', type: 'varchar', length: 128, nullable: true })
  correlationId: string | null;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ type: 'enum', enum: ClockAttemptResult })
  result: ClockAttemptResult;

  @Column({ name: 'http_status', type: 'integer' })
  httpStatus: number;

  @Column({ name: 'failure_codes', type: 'jsonb', nullable: true })
  failureCodes: string[] | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @Column({ name: 'requested_shift_assignment_id', type: 'uuid', nullable: true })
  requestedShiftAssignmentId: string | null;

  @Column({ name: 'created_work_session_id', type: 'uuid', nullable: true })
  createdWorkSessionId: string | null;

  @Column({ name: 'created_attendance_event_id', type: 'uuid', nullable: true })
  createdAttendanceEventId: string | null;

  @Column({ name: 'request_context', type: 'jsonb' })
  requestContext: Record<string, unknown>;

  @Column({ name: 'policy_result', type: 'jsonb', nullable: true })
  policyResult: Record<string, unknown> | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
