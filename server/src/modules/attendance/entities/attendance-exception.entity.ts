import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'attendance_exceptions' })
@Index(['organizationId', 'status', 'severity', 'createdAt'])
export class AttendanceException extends TenantBaseDomain {
  @Column({ name: 'employee_membership_id', type: 'uuid' })
  employeeMembershipId: string;

  @Column({ name: 'work_session_id', type: 'uuid', nullable: true })
  workSessionId: string | null;

  @Column({ name: 'attendance_event_id', type: 'uuid', nullable: true })
  attendanceEventId: string | null;

  @Column({ type: 'varchar', length: 120 })
  code: string;

  @Column({ type: 'varchar', length: 40 })
  severity: string;

  @Column({ type: 'varchar', length: 500 })
  message: string;

  @Column({ type: 'varchar', length: 40, default: 'OPEN' })
  status: string;
}
