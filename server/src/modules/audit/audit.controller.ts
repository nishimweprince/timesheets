import { Controller, Get, Param, Query } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('audit.read.organization')
  findMany(@CurrentUser() user: RequestUser, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.auditService.findMany({
      organizationId: user.organizationId,
      cursor,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get('entity/:entityType/:entityId')
  @Permissions('audit.read.organization')
  findEntity() {
    return { data: [], nextCursor: null };
  }

  @Get(':id')
  @Permissions('audit.read.organization')
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
