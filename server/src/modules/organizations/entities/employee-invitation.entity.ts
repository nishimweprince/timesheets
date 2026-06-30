import { Column, Entity, Index } from 'typeorm';
import { TenantBaseDomain } from '../../../common/entities/tenant-base-domain.entity';
import { Auditable } from '../../audit/auditable.decorator';

@Auditable()
@Entity({ name: 'employee_invitations' })
@Index(['organizationId', 'membershipId'])
@Index(['organizationId', 'email'])
export class EmployeeInvitation extends TenantBaseDomain {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ type: 'citext' })
  email: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'invited_by_membership_id', type: 'uuid', nullable: true })
  invitedByMembershipId: string | null;
}
