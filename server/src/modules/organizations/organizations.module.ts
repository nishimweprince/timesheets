import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipRole } from '../authorization/entities/membership-role.entity';
import { Role } from '../authorization/entities/role.entity';
import { MailModule } from '../mail/mail.module';
import { EmployeeInvitation } from './entities/employee-invitation.entity';
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { EmployeeProfile } from './entities/employee-profile.entity';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { EmployeeInvitationsController, EmployeesController, OrganizationsController, TeamsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([
      Organization,
      User,
      OrganizationMembership,
      EmployeeProfile,
      Team,
      TeamMembership,
      Role,
      MembershipRole,
      EmployeeInvitation
    ])
  ],
  controllers: [OrganizationsController, EmployeesController, TeamsController, EmployeeInvitationsController],
  providers: [OrganizationsService],
  exports: [TypeOrmModule]
})
export class OrganizationsModule {}
