import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RequestUser } from '../../common/types/authenticated-request';
import { MailService } from '../mail/mail.service';
import { MembershipRole } from '../authorization/entities/membership-role.entity';
import { Role } from '../authorization/entities/role.entity';
import { AcceptEmployeeInvitationDto, CreateTeamDto, InviteEmployeeDto, UpdateEmployeeDto, UpdateTeamDto } from './dto/employee-management.dto';
import { EmployeeInvitation } from './entities/employee-invitation.entity';
import { EmployeeProfile } from './entities/employee-profile.entity';
import { OrganizationMembership, MembershipStatus } from './entities/organization-membership.entity';
import { Organization } from './entities/organization.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { Team } from './entities/team.entity';
import { User } from './entities/user.entity';

type EmployeeSummary = {
  membershipId: string;
  userId: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: MembershipStatus;
  employeeNumber: string | null;
  jobTitle: string | null;
  managerMembershipId: string | null;
  primaryWorkSiteId: string | null;
  roleName: string | null;
  teams: Array<{ id: string; name: string }>;
  invitation: { status: 'pending' | 'accepted' | 'expired' | null; expiresAt: Date | null };
  createdAt: Date;
  updatedAt: Date;
};

type TeamSummary = {
  id: string;
  organizationId: string;
  name: string;
  managerMembershipId: string | null;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OrganizationMembership) private readonly memberships: Repository<OrganizationMembership>,
    @InjectRepository(EmployeeProfile) private readonly employeeProfiles: Repository<EmployeeProfile>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(TeamMembership) private readonly teamMemberships: Repository<TeamMembership>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(MembershipRole) private readonly membershipRoles: Repository<MembershipRole>,
    @InjectRepository(EmployeeInvitation) private readonly invitations: Repository<EmployeeInvitation>
  ) {}

  currentOrganization(user: RequestUser) {
    return this.organizations.findOneByOrFail({ id: user.organizationId });
  }

  async listEmployees(user: RequestUser): Promise<EmployeeSummary[]> {
    const memberships = await this.memberships.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: 'DESC' }
    });
    return this.buildEmployeeSummaries(user.organizationId, memberships);
  }

  async inviteEmployee(user: RequestUser, dto: InviteEmployeeDto): Promise<EmployeeSummary> {
    const email = dto.email.trim().toLowerCase();
    const roleName = dto.roleName?.trim() || 'Employee';
    const teamIds = dto.teamIds ?? [];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const rawPassword = crypto.randomBytes(32).toString('base64url');
    const expiresAt = this.invitationExpiry();

    const { organization, membershipId } = await this.dataSource.transaction(async (manager) => {
      const organizationRepo = manager.getRepository(Organization);
      const userRepo = manager.getRepository(User);
      const membershipRepo = manager.getRepository(OrganizationMembership);
      const profileRepo = manager.getRepository(EmployeeProfile);
      const teamRepo = manager.getRepository(Team);
      const teamMembershipRepo = manager.getRepository(TeamMembership);
      const roleRepo = manager.getRepository(Role);
      const membershipRoleRepo = manager.getRepository(MembershipRole);
      const invitationRepo = manager.getRepository(EmployeeInvitation);

      const organization = await organizationRepo.findOneByOrFail({ id: user.organizationId });
      const role = await roleRepo.findOne({ where: { organizationId: user.organizationId, name: roleName } });
      if (!role) throw new BadRequestException(`Role "${roleName}" is not available`);

      await this.ensureTeamsExist(teamRepo, user.organizationId, teamIds);
      if (dto.managerMembershipId) {
        await this.ensureMembershipExists(membershipRepo, user.organizationId, dto.managerMembershipId);
      }

      let invitedUser = await userRepo.findOne({ where: { email } });
      if (invitedUser) {
        const existingMembership = await membershipRepo.findOne({
          where: { organizationId: user.organizationId, userId: invitedUser.id }
        });
        if (existingMembership) throw new ConflictException('Employee already belongs to this organization');
      } else {
        invitedUser = await userRepo.save(
          userRepo.create({
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            passwordHash: await bcrypt.hash(rawPassword, 12),
            active: true
          })
        );
      }

      const membership = await membershipRepo.save(
        membershipRepo.create({
          organizationId: user.organizationId,
          userId: invitedUser.id,
          status: MembershipStatus.PENDING,
          primaryWorkSiteId: null
        })
      );

      await profileRepo.save(
        profileRepo.create({
          organizationId: user.organizationId,
          membershipId: membership.id,
          employeeNumber: this.nullableString(dto.employeeNumber),
          jobTitle: this.nullableString(dto.jobTitle),
          managerMembershipId: dto.managerMembershipId ?? null,
          hiredAt: null
        })
      );

      await membershipRoleRepo.save(membershipRoleRepo.create({ membershipId: membership.id, roleId: role.id }));

      if (teamIds.length > 0) {
        await teamMembershipRepo.save(
          teamIds.map((teamId) =>
            teamMembershipRepo.create({ organizationId: user.organizationId, teamId, membershipId: membership.id })
          )
        );
      }

      await invitationRepo.save(
        invitationRepo.create({
          organizationId: user.organizationId,
          userId: invitedUser.id,
          membershipId: membership.id,
          email,
          tokenHash: await bcrypt.hash(rawToken, 12),
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          invitedByMembershipId: user.membershipId
        })
      );

      return { organization, membershipId: membership.id };
    });

    await this.mailService.sendEmployeeInvitation(email, this.onboardingUrl(rawToken), organization.name);
    return this.findEmployeeSummary(user.organizationId, membershipId);
  }

  async updateEmployee(user: RequestUser, membershipId: string, dto: UpdateEmployeeDto): Promise<EmployeeSummary> {
    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const membershipRepo = manager.getRepository(OrganizationMembership);
      const profileRepo = manager.getRepository(EmployeeProfile);
      const teamRepo = manager.getRepository(Team);
      const teamMembershipRepo = manager.getRepository(TeamMembership);
      const roleRepo = manager.getRepository(Role);
      const membershipRoleRepo = manager.getRepository(MembershipRole);

      const membership = await this.ensureMembershipExists(membershipRepo, user.organizationId, membershipId);
      const employeeUser = await userRepo.findOneByOrFail({ id: membership.userId });

      if (dto.firstName !== undefined) employeeUser.firstName = dto.firstName.trim();
      if (dto.lastName !== undefined) employeeUser.lastName = dto.lastName.trim();
      await userRepo.save(employeeUser);

      if (dto.status !== undefined) {
        membership.status = dto.status;
        await membershipRepo.save(membership);
      }

      let profile = await profileRepo.findOne({ where: { organizationId: user.organizationId, membershipId } });
      if (!profile) {
        profile = profileRepo.create({ organizationId: user.organizationId, membershipId, employeeNumber: null, jobTitle: null, managerMembershipId: null, hiredAt: null });
      }
      if (dto.employeeNumber !== undefined) profile.employeeNumber = this.nullableString(dto.employeeNumber);
      if (dto.jobTitle !== undefined) profile.jobTitle = this.nullableString(dto.jobTitle);
      if (dto.managerMembershipId !== undefined) {
        if (dto.managerMembershipId) await this.ensureMembershipExists(membershipRepo, user.organizationId, dto.managerMembershipId);
        profile.managerMembershipId = dto.managerMembershipId ?? null;
      }
      await profileRepo.save(profile);

      if (dto.roleName !== undefined) {
        const role = await roleRepo.findOne({ where: { organizationId: user.organizationId, name: dto.roleName } });
        if (!role) throw new BadRequestException(`Role "${dto.roleName}" is not available`);
        await membershipRoleRepo.delete({ membershipId });
        await membershipRoleRepo.save(membershipRoleRepo.create({ membershipId, roleId: role.id }));
      }

      if (dto.teamIds !== undefined) {
        await this.ensureTeamsExist(teamRepo, user.organizationId, dto.teamIds);
        await teamMembershipRepo.delete({ organizationId: user.organizationId, membershipId });
        if (dto.teamIds.length > 0) {
          await teamMembershipRepo.save(
            dto.teamIds.map((teamId) => teamMembershipRepo.create({ organizationId: user.organizationId, teamId, membershipId }))
          );
        }
      }
    });

    return this.findEmployeeSummary(user.organizationId, membershipId);
  }

  async resendInvitation(user: RequestUser, membershipId: string): Promise<EmployeeSummary> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = this.invitationExpiry();

    const { email, organization } = await this.dataSource.transaction(async (manager) => {
      const organizationRepo = manager.getRepository(Organization);
      const userRepo = manager.getRepository(User);
      const membershipRepo = manager.getRepository(OrganizationMembership);
      const invitationRepo = manager.getRepository(EmployeeInvitation);

      const membership = await this.ensureMembershipExists(membershipRepo, user.organizationId, membershipId);
      if (membership.status !== MembershipStatus.PENDING) {
        throw new BadRequestException('Only pending employees can receive invitation reminders');
      }

      const invitedUser = await userRepo.findOneByOrFail({ id: membership.userId });
      const openInvites = await invitationRepo.find({
        where: { organizationId: user.organizationId, membershipId, acceptedAt: IsNull(), revokedAt: IsNull() }
      });
      for (const invite of openInvites) invite.revokedAt = new Date();
      if (openInvites.length > 0) await invitationRepo.save(openInvites);

      await invitationRepo.save(
        invitationRepo.create({
          organizationId: user.organizationId,
          userId: invitedUser.id,
          membershipId,
          email: invitedUser.email,
          tokenHash: await bcrypt.hash(rawToken, 12),
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          invitedByMembershipId: user.membershipId
        })
      );

      return { email: invitedUser.email, organization: await organizationRepo.findOneByOrFail({ id: user.organizationId }) };
    });

    await this.mailService.sendEmployeeInvitation(email, this.onboardingUrl(rawToken), organization.name);
    return this.findEmployeeSummary(user.organizationId, membershipId);
  }

  async listTeams(user: RequestUser): Promise<TeamSummary[]> {
    const teams = await this.teams.find({ where: { organizationId: user.organizationId }, order: { name: 'ASC' } });
    return this.buildTeamSummaries(user.organizationId, teams);
  }

  async createTeam(user: RequestUser, dto: CreateTeamDto): Promise<TeamSummary> {
    if (dto.managerMembershipId) await this.ensureMembershipExists(this.memberships, user.organizationId, dto.managerMembershipId);
    const team = await this.teams.save(
      this.teams.create({
        organizationId: user.organizationId,
        name: dto.name.trim(),
        managerMembershipId: dto.managerMembershipId ?? null
      })
    );
    return (await this.buildTeamSummaries(user.organizationId, [team]))[0];
  }

  async updateTeam(user: RequestUser, teamId: string, dto: UpdateTeamDto): Promise<TeamSummary> {
    const team = await this.teams.findOne({ where: { id: teamId, organizationId: user.organizationId } });
    if (!team) throw new NotFoundException('Team not found');
    if (dto.name !== undefined) team.name = dto.name.trim();
    if (dto.managerMembershipId !== undefined) {
      if (dto.managerMembershipId) await this.ensureMembershipExists(this.memberships, user.organizationId, dto.managerMembershipId);
      team.managerMembershipId = dto.managerMembershipId ?? null;
    }
    const saved = await this.teams.save(team);
    return (await this.buildTeamSummaries(user.organizationId, [saved]))[0];
  }

  async previewInvitation(token: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    expiresAt: Date;
  }> {
    const invite = await this.findValidInvitation(token);
    const [organization, invitedUser] = await Promise.all([
      this.organizations.findOneByOrFail({ id: invite.organizationId }),
      this.users.findOneByOrFail({ id: invite.userId })
    ]);
    return {
      email: invite.email,
      firstName: invitedUser.firstName,
      lastName: invitedUser.lastName,
      organizationName: organization.name,
      expiresAt: invite.expiresAt
    };
  }

  async acceptInvitation(dto: AcceptEmployeeInvitationDto): Promise<{ success: true }> {
    const invite = await this.findValidInvitation(dto.token);

    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const membershipRepo = manager.getRepository(OrganizationMembership);
      const profileRepo = manager.getRepository(EmployeeProfile);
      const invitationRepo = manager.getRepository(EmployeeInvitation);

      const freshInvite = await invitationRepo.findOneByOrFail({ id: invite.id });
      if (freshInvite.acceptedAt || freshInvite.revokedAt || freshInvite.expiresAt < new Date()) {
        throw new UnauthorizedException('Invitation link is invalid or expired');
      }

      const invitedUser = await userRepo.findOneByOrFail({ id: freshInvite.userId });
      invitedUser.firstName = dto.firstName.trim();
      invitedUser.lastName = dto.lastName.trim();
      invitedUser.passwordHash = await bcrypt.hash(dto.password, 12);
      await userRepo.save(invitedUser);

      const membership = await membershipRepo.findOneByOrFail({ id: freshInvite.membershipId, organizationId: freshInvite.organizationId });
      membership.status = MembershipStatus.ACTIVE;
      await membershipRepo.save(membership);

      let profile = await profileRepo.findOne({ where: { organizationId: freshInvite.organizationId, membershipId: freshInvite.membershipId } });
      if (!profile) {
        profile = profileRepo.create({ organizationId: freshInvite.organizationId, membershipId: freshInvite.membershipId, employeeNumber: null, jobTitle: null, managerMembershipId: null, hiredAt: null });
        await profileRepo.save(profile);
      }

      freshInvite.acceptedAt = new Date();
      await invitationRepo.save(freshInvite);
    });

    return { success: true };
  }

  private async findEmployeeSummary(organizationId: string, membershipId: string): Promise<EmployeeSummary> {
    const membership = await this.memberships.findOne({ where: { id: membershipId, organizationId } });
    if (!membership) throw new NotFoundException('Employee not found');
    return (await this.buildEmployeeSummaries(organizationId, [membership]))[0];
  }

  private async buildEmployeeSummaries(organizationId: string, memberships: OrganizationMembership[]): Promise<EmployeeSummary[]> {
    if (memberships.length === 0) return [];
    const membershipIds = memberships.map((membership) => membership.id);
    const userIds = memberships.map((membership) => membership.userId);

    const [users, profiles, membershipRoles, teamMemberships, invitations] = await Promise.all([
      this.users.find({ where: { id: In(userIds) } }),
      this.employeeProfiles.find({ where: { organizationId, membershipId: In(membershipIds) } }),
      this.membershipRoles.find({ where: { membershipId: In(membershipIds) } }),
      this.teamMemberships.find({ where: { organizationId, membershipId: In(membershipIds) } }),
      this.invitations.find({ where: { organizationId, membershipId: In(membershipIds) }, order: { createdAt: 'DESC' } })
    ]);

    const roleIds = membershipRoles.map((item) => item.roleId);
    const teamIds = teamMemberships.map((item) => item.teamId);
    const [roles, teams] = await Promise.all([
      roleIds.length > 0 ? this.roles.find({ where: { id: In(roleIds) } }) : Promise.resolve([]),
      teamIds.length > 0 ? this.teams.find({ where: { organizationId, id: In(teamIds) } }) : Promise.resolve([])
    ]);

    const usersById = new Map(users.map((item) => [item.id, item]));
    const profilesByMembership = new Map(profiles.map((item) => [item.membershipId, item]));
    const rolesById = new Map(roles.map((item) => [item.id, item]));
    const teamsById = new Map(teams.map((item) => [item.id, item]));
    const roleByMembership = new Map(membershipRoles.map((item) => [item.membershipId, rolesById.get(item.roleId)?.name ?? null]));
    const teamsByMembership = new Map<string, Array<{ id: string; name: string }>>();
    const latestInviteByMembership = new Map<string, EmployeeInvitation>();

    for (const item of teamMemberships) {
      const team = teamsById.get(item.teamId);
      if (!team) continue;
      const existing = teamsByMembership.get(item.membershipId) ?? [];
      existing.push({ id: team.id, name: team.name });
      teamsByMembership.set(item.membershipId, existing);
    }

    for (const invite of invitations) {
      if (!latestInviteByMembership.has(invite.membershipId)) latestInviteByMembership.set(invite.membershipId, invite);
    }

    return memberships.map((membership) => {
      const employeeUser = usersById.get(membership.userId);
      if (!employeeUser) throw new NotFoundException('Employee user not found');
      const profile = profilesByMembership.get(membership.id);
      const invite = latestInviteByMembership.get(membership.id);
      return {
        membershipId: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        email: employeeUser.email,
        firstName: employeeUser.firstName,
        lastName: employeeUser.lastName,
        status: membership.status,
        employeeNumber: profile?.employeeNumber ?? null,
        jobTitle: profile?.jobTitle ?? null,
        managerMembershipId: profile?.managerMembershipId ?? null,
        primaryWorkSiteId: membership.primaryWorkSiteId,
        roleName: roleByMembership.get(membership.id) ?? null,
        teams: (teamsByMembership.get(membership.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
        invitation: invite
          ? {
              status: invite.acceptedAt ? 'accepted' : invite.expiresAt < new Date() || invite.revokedAt ? 'expired' : 'pending',
              expiresAt: invite.expiresAt
            }
          : { status: null, expiresAt: null },
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt
      };
    });
  }

  private async buildTeamSummaries(organizationId: string, teams: Team[]): Promise<TeamSummary[]> {
    if (teams.length === 0) return [];
    const teamIds = teams.map((team) => team.id);
    const memberships = await this.teamMemberships.find({ where: { organizationId, teamId: In(teamIds) } });
    const countByTeam = new Map<string, number>();
    for (const membership of memberships) {
      countByTeam.set(membership.teamId, (countByTeam.get(membership.teamId) ?? 0) + 1);
    }
    return teams.map((team) => ({
      id: team.id,
      organizationId: team.organizationId,
      name: team.name,
      managerMembershipId: team.managerMembershipId,
      memberCount: countByTeam.get(team.id) ?? 0,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    }));
  }

  private async findValidInvitation(token: string): Promise<EmployeeInvitation> {
    const candidates = await this.invitations.find({ where: { acceptedAt: IsNull(), revokedAt: IsNull() } });
    const now = new Date();
    for (const candidate of candidates) {
      if (candidate.expiresAt < now) continue;
      if (await bcrypt.compare(token, candidate.tokenHash)) return candidate;
    }
    throw new UnauthorizedException('Invitation link is invalid or expired');
  }

  private async ensureMembershipExists(
    repo: Repository<OrganizationMembership>,
    organizationId: string,
    membershipId: string
  ): Promise<OrganizationMembership> {
    const membership = await repo.findOne({ where: { id: membershipId, organizationId } });
    if (!membership) throw new NotFoundException('Employee not found');
    return membership;
  }

  private async ensureTeamsExist(repo: Repository<Team>, organizationId: string, teamIds: string[]): Promise<void> {
    if (teamIds.length === 0) return;
    const teams = await repo.find({ where: { organizationId, id: In(teamIds) } });
    if (teams.length !== teamIds.length) throw new BadRequestException('One or more teams are not available');
  }

  private nullableString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private invitationExpiry(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private onboardingUrl(token: string): string {
    return `${this.config.getOrThrow<string>('APP_URL')}/auth/onboarding?token=${token}`;
  }
}
