import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MailModule } from '../mail/mail.module';
import { User } from '../organizations/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { RefreshTokenSession } from './entities/refresh-token-session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({}),
    AuthorizationModule,
    MailModule,
    TypeOrmModule.forFeature([User, OrganizationMembership, RefreshTokenSession, PasswordResetToken])
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
