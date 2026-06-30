import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../organizations/entities/user.entity';
import { OrganizationMembership, MembershipStatus } from '../organizations/entities/organization-membership.entity';
import { MembershipRole } from '../authorization/entities/membership-role.entity';
import { Role } from '../authorization/entities/role.entity';
import { AuthorizationService } from '../authorization/authorization.service';
import { RefreshTokenSession } from './entities/refresh-token-session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { LoginDto } from './dto/auth.dto';
import { RequestUser } from '../../common/types/authenticated-request';
import { MailService } from '../mail/mail.service';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: RequestUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly authorizationService: AuthorizationService,
    private readonly mailService: MailService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OrganizationMembership) private readonly memberships: Repository<OrganizationMembership>,
    @InjectRepository(MembershipRole) private readonly membershipRoles: Repository<MembershipRole>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(RefreshTokenSession) private readonly refreshSessions: Repository<RefreshTokenSession>,
    @InjectRepository(PasswordResetToken) private readonly resetTokens: Repository<PasswordResetToken>
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase(), active: true } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    const memberships = await this.memberships.find({
      where: { userId: user.id, status: MembershipStatus.ACTIVE, ...(dto.organizationId ? { organizationId: dto.organizationId } : {}) }
    });
    const membership = memberships[0];
    if (!membership) throw new UnauthorizedException('No active organization membership');
    return this.issueTokens(user, membership);
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    let payload: { sub: string; membershipId: string; sessionId: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.refreshSessions.findOne({
      where: { id: payload.sessionId, userId: payload.sub, membershipId: payload.membershipId, revokedAt: IsNull() }
    });
    if (!session || session.expiresAt < new Date() || !(await bcrypt.compare(refreshToken, session.tokenHash))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    session.revokedAt = new Date();
    await this.refreshSessions.save(session);

    const user = await this.users.findOneByOrFail({ id: payload.sub });
    const membership = await this.memberships.findOneByOrFail({ id: payload.membershipId });
    return this.issueTokens(user, membership);
  }

  async logout(sessionId: string | undefined): Promise<{ success: true }> {
    if (sessionId) {
      const session = await this.refreshSessions.findOne({ where: { id: sessionId, revokedAt: IsNull() } });
      if (session) {
        session.revokedAt = new Date();
        await this.refreshSessions.save(session);
      }
    }
    return { success: true };
  }

  async forgotPassword(email: string): Promise<{ success: true }> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase(), active: true } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, 12);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await this.resetTokens.save(
        this.resetTokens.create({ userId: user.id, tokenHash, expiresAt, usedAt: null })
      );

      const appUrl = this.config.getOrThrow<string>('APP_URL');
      const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
      await this.mailService.sendPasswordReset(user.email, resetUrl);
    }

    return { success: true };
  }

  async resetPassword(token: string, password: string): Promise<{ success: true }> {
    const candidates = await this.resetTokens.find({ where: { usedAt: IsNull() } });
    const now = new Date();
    let matched: PasswordResetToken | null = null;

    for (const candidate of candidates) {
      if (candidate.expiresAt < now) continue;
      if (await bcrypt.compare(token, candidate.tokenHash)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid or expired password reset token');

    matched.usedAt = new Date();
    await this.resetTokens.save(matched);

    const user = await this.users.findOneByOrFail({ id: matched.userId });
    user.passwordHash = await bcrypt.hash(password, 12);
    await this.users.save(user);

    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: true }> {
    const user = await this.users.findOne({ where: { id: userId, active: true } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must be different from your current password');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.save(user);

    return { success: true };
  }

  async buildRequestUser(userId: string, membershipId: string, sessionId?: string): Promise<RequestUser> {
    const user = await this.users.findOneByOrFail({ id: userId });
    const membership = await this.memberships.findOneByOrFail({ id: membershipId });
    const permissions = await this.authorizationService.permissionsForMembership(membership.id);
    const roleNames = await this.roleNamesForMembership(membership.id);
    return this.buildAuthUser(user, membership, permissions, roleNames, sessionId);
  }

  private async issueTokens(user: User, membership: OrganizationMembership): Promise<TokenResponse> {
    const permissions = await this.authorizationService.permissionsForMembership(membership.id);
    const roleNames = await this.roleNamesForMembership(membership.id);
    const session = await this.refreshSessions.save(
      this.refreshSessions.create({
        userId: user.id,
        membershipId: membership.id,
        tokenHash: 'pending',
        expiresAt: this.futureDate(this.config.getOrThrow<string>('JWT_REFRESH_TTL'))
      })
    );
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, membershipId: membership.id, organizationId: membership.organizationId },
      { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL') as never }
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, membershipId: membership.id, sessionId: session.id },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_TTL') as never }
    );
    session.tokenHash = await bcrypt.hash(refreshToken, 12);
    await this.refreshSessions.save(session);

    return {
      accessToken,
      refreshToken,
      user: this.buildAuthUser(user, membership, permissions, roleNames, session.id)
    };
  }

  private buildAuthUser(
    user: User,
    membership: OrganizationMembership,
    permissions: string[],
    roleNames: string[],
    sessionId?: string
  ): RequestUser {
    const fullName = `${user.firstName} ${user.lastName}`.trim();

    return {
      userId: user.id,
      membershipId: membership.id,
      organizationId: membership.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: fullName || user.email,
      membershipStatus: membership.status,
      primaryWorkSiteId: membership.primaryWorkSiteId,
      roleNames,
      permissions,
      sessionId
    };
  }

  private async roleNamesForMembership(membershipId: string): Promise<string[]> {
    const membershipRoles = await this.membershipRoles.find({ where: { membershipId } });
    const roleIds = membershipRoles.map((item) => item.roleId);
    if (roleIds.length === 0) return [];

    const roles = await this.roles.find({ where: { id: In(roleIds) } });
    return roles.map((role) => role.name).sort((a, b) => a.localeCompare(b));
  }

  private futureDate(ttl: string): Date {
    const match = ttl.match(/^(\d+)([mhd])$/);
    const amount = match ? Number(match[1]) : 30;
    const unit = match?.[2] ?? 'd';
    const multiplier = unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return new Date(Date.now() + amount * multiplier);
  }
}
