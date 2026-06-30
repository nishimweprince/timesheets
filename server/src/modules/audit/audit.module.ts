import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditOutbox } from './entities/audit-outbox.entity';
import { AuditContextService } from './audit-context.service';
import { AuditService } from './audit.service';
import { AuditSubscriber } from './audit.subscriber';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, AuditOutbox])],
  controllers: [AuditController],
  providers: [AuditContextService, AuditService, AuditSubscriber],
  exports: [AuditContextService, AuditService]
})
export class AuditModule {}
