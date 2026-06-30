import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

export enum ShiftSwapStatus {
  DRAFT = 'DRAFT',
  PENDING_COUNTERPARTY = 'PENDING_COUNTERPARTY',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

@Auditable()
@Entity({ name: 'shift_swap_requests' })
@Index(['organizationId', 'requesterMembershipId'])
export class ShiftSwapRequest extends TenantBaseDomain {
  @Column({ name: 'requester_membership_id', type: 'uuid' })
  requesterMembershipId: string;

  @Column({ name: 'counterparty_membership_id', type: 'uuid', nullable: true })
  counterpartyMembershipId: string | null;

  @Column({ name: 'requester_shift_assignment_id', type: 'uuid' })
  requesterShiftAssignmentId: string;

  @Column({ name: 'counterparty_shift_assignment_id', type: 'uuid', nullable: true })
  counterpartyShiftAssignmentId: string | null;

  @Column({ type: 'enum', enum: ShiftSwapStatus, default: ShiftSwapStatus.PENDING_COUNTERPARTY })
  status: ShiftSwapStatus;
}
