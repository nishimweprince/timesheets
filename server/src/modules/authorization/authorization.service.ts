import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MembershipPermissionOverride, PermissionOverrideEffect } from './entities/membership-permission-override.entity';
import { MembershipRole } from './entities/membership-role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(MembershipRole) private readonly membershipRoles: Repository<MembershipRole>,
    @InjectRepository(RolePermission) private readonly rolePermissions: Repository<RolePermission>,
    @InjectRepository(MembershipPermissionOverride) private readonly overrides: Repository<MembershipPermissionOverride>
  ) {}

  async permissionsForMembership(membershipId: string): Promise<string[]> {
    const membershipRoles = await this.membershipRoles.find({ where: { membershipId } });
    const roleIds = membershipRoles.map((item) => item.roleId);
    const rolePermissions = roleIds.length > 0 ? await this.rolePermissions.find({ where: { roleId: In(roleIds) } }) : [];
    const permissionIds = new Set(rolePermissions.map((item) => item.permissionId));
    const overrides = await this.overrides.find({ where: { membershipId } });

    for (const override of overrides) {
      if (override.effect === PermissionOverrideEffect.DENY) permissionIds.delete(override.permissionId);
      if (override.effect === PermissionOverrideEffect.GRANT) permissionIds.add(override.permissionId);
    }

    const permissions = permissionIds.size > 0 ? await this.permissions.find({ where: { id: In([...permissionIds]) } }) : [];
    return permissions.map((permission) => permission.key).sort();
  }
}
