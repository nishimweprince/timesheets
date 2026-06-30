import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../organizations/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { EmployeeProfile } from '../organizations/entities/employee-profile.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { MembershipRole } from './entities/membership-role.entity';
import { MembershipPermissionOverride } from './entities/membership-permission-override.entity';
import { AuthorizationService } from './authorization.service';
import { AuthorizationSeedService } from './authorization-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      User,
      OrganizationMembership,
      EmployeeProfile,
      Permission,
      Role,
      RolePermission,
      MembershipRole,
      MembershipPermissionOverride
    ])
  ],
  providers: [AuthorizationService, AuthorizationSeedService],
  exports: [AuthorizationService]
})
export class AuthorizationModule {}
