import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { AuditContextService } from './audit-context.service';
import { AuditLayer, AuditLog } from './entities/audit-log.entity';
import { isAuditableEntity } from './auditable.decorator';
import { redact } from './audit-redaction';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(
    dataSource: DataSource,
    private readonly auditContext: AuditContextService
  ) {
    dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<object>): Promise<void> {
    if (!this.shouldAudit(event.metadata.target)) return;
    await this.write(event, 'CREATE', null, event.entity as Record<string, unknown>);
  }

  async afterUpdate(event: UpdateEvent<object>): Promise<void> {
    if (!this.shouldAudit(event.metadata.target)) return;
    await this.write(
      event,
      'UPDATE',
      event.databaseEntity as Record<string, unknown> | null,
      event.entity as Record<string, unknown> | null
    );
  }

  async afterRemove(event: RemoveEvent<object>): Promise<void> {
    if (!this.shouldAudit(event.metadata.target)) return;
    await this.write(event, 'DELETE', event.databaseEntity as Record<string, unknown> | null, null);
  }

  private shouldAudit(target: Function | string): boolean {
    return typeof target === 'function' && isAuditableEntity(target);
  }

  private async write(
    event: InsertEvent<object> | UpdateEvent<object> | RemoveEvent<object>,
    operation: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null
  ): Promise<void> {
    const store = this.auditContext.getStore();
    const entityId = String((newValues?.id ?? oldValues?.id ?? '') as string);
    await event.manager.getRepository(AuditLog).save({
      action: `entity.${operation.toLowerCase()}`,
      layer: AuditLayer.ENTITY,
      operation,
      entityType: event.metadata.name,
      entityId: entityId || null,
      oldValues: redact(oldValues) as Record<string, unknown> | null,
      newValues: redact(newValues) as Record<string, unknown> | null,
      correlationId: store?.correlationId ?? null,
      organizationId: store?.organizationId ?? ((newValues?.organizationId ?? oldValues?.organizationId ?? null) as string | null),
      createdById: store?.userId ?? null,
      httpMethod: store?.httpMethod ?? null,
      httpPath: store?.httpPath ?? null,
      ip: store?.ip ?? null,
      userAgent: store?.userAgent ?? null
    });
  }
}
