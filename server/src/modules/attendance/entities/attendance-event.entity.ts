import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AttendanceEventType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  AUTO_CLOCK_OUT = 'AUTO_CLOCK_OUT',
  CORRECTION_REQUESTED = 'CORRECTION_REQUESTED',
  CORRECTION_APPROVED = 'CORRECTION_APPROVED',
  CORRECTION_REJECTED = 'CORRECTION_REJECTED',
  CORRECTION_APPLIED = 'CORRECTION_APPLIED',
  SHIFT_REASSIGNED = 'SHIFT_REASSIGNED',
  TIMESHEET_APPROVED = 'TIMESHEET_APPROVED',
  TIMESHEET_LOCKED = 'TIMESHEET_LOCKED'
}

@Entity({ name: 'attendance_events' })
@Index(['organizationId', 'employeeMembershipId', 'serverReceivedAt'])
export class AttendanceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ name: 'work_session_id', type: 'uuid', nullable: true })
  workSessionId: string | null;

  @Column({ name: 'event_type', type: 'enum', enum: AttendanceEventType })
  eventType: AttendanceEventType;

  @Column({ name: 'event_source', type: 'varchar', length: 40, default: 'WEB' })
  eventSource: string;

  @Column({ name: 'server_received_at', type: 'timestamptz' })
  serverReceivedAt: Date;

  @Column({ name: 'client_reported_at', type: 'timestamptz', nullable: true })
  clientReportedAt: Date | null;

  @Column({ name: 'client_timezone', type: 'varchar', length: 80, nullable: true })
  clientTimezone: string | null;

  @Column({ name: 'client_utc_offset_minutes', type: 'integer', nullable: true })
  clientUtcOffsetMinutes: number | null;

  @Column({ name: 'client_server_time_delta_seconds', type: 'integer', nullable: true })
  clientServerTimeDeltaSeconds: number | null;

  @Column({ name: 'requested_shift_assignment_id', type: 'uuid', nullable: true })
  requestedShiftAssignmentId: string | null;

  @Column({ name: 'resolved_shift_assignment_id', type: 'uuid', nullable: true })
  resolvedShiftAssignmentId: string | null;

  @Column({ name: 'resolved_shift_instance_id', type: 'uuid', nullable: true })
  resolvedShiftInstanceId: string | null;

  @Column({ name: 'location_point', type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  locationPoint: { type: 'Point'; coordinates: [number, number] } | null;

  @Column({ name: 'location_accuracy_meters', type: 'integer', nullable: true })
  locationAccuracyMeters: number | null;

  @Column({ name: 'location_source', type: 'varchar', length: 80, nullable: true })
  locationSource: string | null;

  @Column({ name: 'location_captured_at', type: 'timestamptz', nullable: true })
  locationCapturedAt: Date | null;

  @Column({ name: 'location_permission_state', type: 'varchar', length: 80, nullable: true })
  locationPermissionState: string | null;

  @Column({ name: 'geofence_result', type: 'varchar', length: 80, nullable: true })
  geofenceResult: string | null;

  @Column({ name: 'matched_work_site_id', type: 'uuid', nullable: true })
  matchedWorkSiteId: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'network_context', type: 'jsonb', nullable: true })
  networkContext: Record<string, unknown> | null;

  @Column({ name: 'device_context', type: 'jsonb', nullable: true })
  deviceContext: Record<string, unknown> | null;

  @Column({ name: 'camera_required', type: 'boolean', default: false })
  cameraRequired: boolean;

  @Column({ name: 'camera_evidence_id', type: 'uuid', nullable: true })
  cameraEvidenceId: string | null;

  @Column({ name: 'evidence_validation_result', type: 'jsonb', nullable: true })
  evidenceValidationResult: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'policy_snapshot', type: 'jsonb' })
  policySnapshot: Record<string, unknown>;

  @Column({ name: 'policy_result', type: 'jsonb' })
  policyResult: Record<string, unknown>;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
