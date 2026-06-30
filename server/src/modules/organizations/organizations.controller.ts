import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { Organization } from './entities/organization.entity';

@Controller('organizations')
export class OrganizationsController {
  constructor(@InjectRepository(Organization) private readonly organizations: Repository<Organization>) {}

  @Get('current')
  @Permissions('organization.read')
  current(@CurrentUser() user: RequestUser) {
    return this.organizations.findOneByOrFail({ id: user.organizationId });
  }
}
