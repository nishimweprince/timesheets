import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { EmployeeProfile } from './entities/employee-profile.entity';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User, OrganizationMembership, EmployeeProfile, Team, TeamMembership])],
  controllers: [OrganizationsController],
  exports: [TypeOrmModule]
})
export class OrganizationsModule {}
