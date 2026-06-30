import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuditLayer, AuditLog } from './entities/audit-log.entity';
import { AuditOutbox, AuditOutboxStatus } from './entities/audit-outbox.entity';
import { redact } from './audit-redaction';

export interface RecordAuditInput {
  action: string;
  layer: AuditLayer;
  correlationId?: string | null;
  organizationId?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  operation?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  httpMethod?: string | null;
  httpPath?: string | null;
  httpStatus?: number | null;
  durationMs?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  bodySnapshot?: Record<string, unknown> | null;
  querySnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(AuditOutbox) private readonly auditOutbox: Repository<AuditOutbox>
  ) {}

  async record(input: RecordAuditInput): Promise<AuditLog> {
    return this.auditLogs.save(
      this.auditLogs.create({
        action: input.action,
        layer: input.layer,
        correlationId: input.correlationId ?? null,
        organizationId: input.organizationId ?? null,
        createdById: input.actorId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        operation: input.operation ?? null,
        oldValues: redact(input.oldValues ?? null) as Record<string, unknown> | null,
        newValues: redact(input.newValues ?? null) as Record<string, unknown> | null,
        httpMethod: input.httpMethod ?? null,
        httpPath: input.httpPath ?? null,
        httpStatus: input.httpStatus ?? null,
        durationMs: input.durationMs ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        bodySnapshot: redact(input.bodySnapshot ?? null) as Record<string, unknown> | null,
        querySnapshot: redact(input.querySnapshot ?? null) as Record<string, unknown> | null,
        metadata: redact(input.metadata ?? null) as Record<string, unknown> | null
      })
    );
  }

  async enqueue(input: RecordAuditInput): Promise<AuditOutbox> {
    return this.auditOutbox.save(
      this.auditOutbox.create({
        action: input.action,
        correlationId: input.correlationId ?? null,
        organizationId: input.organizationId ?? null,
        payload: redact(input as unknown as Record<string, unknown>) as Record<string, unknown>,
        status: AuditOutboxStatus.PENDING
      })
    );
  }

  async findMany(params: { organizationId?: string; cursor?: string; limit?: number }): Promise<{
    data: AuditLog[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(params.limit ?? 50, 100);
    const data = await this.auditLogs.find({
      where: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        ...(params.cursor ? { createdAt: LessThan(new Date(params.cursor)) } : {})
      },
      order: { createdAt: 'DESC' },
      take: limit + 1
    });
    const page = data.slice(0, limit);
    return {
      data: page,
      nextCursor: data.length > limit ? page[page.length - 1]?.createdAt.toISOString() ?? null : null
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.auditLogs.findOne({ where: { id } });
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
