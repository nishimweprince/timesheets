import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../organizations/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { EmployeeProfile } from '../organizations/entities/employee-profile.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { MembershipRole } from './entities/membership-role.entity';
import { PERMISSIONS, ROLE_PERMISSION_BUNDLES } from './permissions';

@Injectable()
export class AuthorizationSeedService implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OrganizationMembership) private readonly memberships: Repository<OrganizationMembership>,
    @InjectRepository(EmployeeProfile) private readonly employeeProfiles: Repository<EmployeeProfile>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rolePermissions: Repository<RolePermission>,
    @InjectRepository(MembershipRole) private readonly membershipRoles: Repository<MembershipRole>
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const permissionMap = await this.seedPermissions();
    const organization = await this.seedOrganization();
    const roleMap = await this.seedRoles(organization.id, permissionMap);
    const membership = await this.seedInitialAdmin(organization.id);
    await this.assignRole(membership.id, roleMap.get('Organization Admin')!.id);
  }

  private async seedPermissions(): Promise<Map<string, Permission>> {
    const map = new Map<string, Permission>();
    for (const key of PERMISSIONS) {
      let permission = await this.permissions.findOne({ where: { key } });
      if (!permission) {
        permission = await this.permissions.save(this.permissions.create({ key, description: key }));
      }
      map.set(key, permission);
    }
    return map;
  }

  private async seedOrganization(): Promise<Organization> {
    const name = this.config.getOrThrow<string>('INITIAL_ORG_NAME');
    let organization = await this.organizations.findOne({ where: { name } });
    if (!organization) {
      organization = await this.organizations.save(
        this.organizations.create({
          name,
          defaultTimezone: 'America/Chicago',
          active: true
        })
      );
    }
    return organization;
  }

  private async seedRoles(organizationId: string, permissionMap: Map<string, Permission>): Promise<Map<string, Role>> {
    const map = new Map<string, Role>();
    for (const [name, permissionKeys] of Object.entries(ROLE_PERMISSION_BUNDLES)) {
      let role = await this.roles.findOne({ where: { organizationId, name } });
      if (!role) {
        role = await this.roles.save(this.roles.create({ organizationId, name, description: `${name} permissions` }));
      }
      map.set(name, role);

      for (const permissionKey of permissionKeys) {
        const permission = permissionMap.get(permissionKey);
        if (!permission) continue;
        const existing = await this.rolePermissions.findOne({ where: { roleId: role.id, permissionId: permission.id } });
        if (!existing) await this.rolePermissions.save(this.rolePermissions.create({ roleId: role.id, permissionId: permission.id }));
      }
    }
    return map;
  }

  private async seedInitialAdmin(organizationId: string): Promise<OrganizationMembership> {
    const email = this.config.getOrThrow<string>('INITIAL_ADMIN_EMAIL').toLowerCase();
    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      user = await this.users.save(
        this.users.create({
          email,
          passwordHash: await bcrypt.hash(this.config.getOrThrow<string>('INITIAL_ADMIN_PASSWORD'), 12),
          firstName: 'Initial',
          lastName: 'Admin',
          active: true
        })
      );
    }

    let membership = await this.memberships.findOne({ where: { organizationId, userId: user.id } });
    if (!membership) {
      membership = await this.memberships.save(this.memberships.create({ organizationId, userId: user.id }));
    }

    const profile = await this.employeeProfiles.findOne({ where: { organizationId, membershipId: membership.id } });
    if (!profile) {
      await this.employeeProfiles.save(
        this.employeeProfiles.create({
          organizationId,
          membershipId: membership.id,
          employeeNumber: 'ADMIN-001',
          jobTitle: 'Administrator'
        })
      );
    }

    return membership;
  }

  private async assignRole(membershipId: string, roleId: string): Promise<void> {
    const existing = await this.membershipRoles.findOne({ where: { membershipId, roleId } });
    if (!existing) await this.membershipRoles.save(this.membershipRoles.create({ membershipId, roleId }));
  }
}
