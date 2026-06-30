import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContextStore {
  correlationId: string | null;
  organizationId: string | null;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  httpMethod: string | null;
  httpPath: string | null;
  requestStartedAt: number;
}

@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditContextStore>();

  run<T>(store: AuditContextStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  getStore(): AuditContextStore | undefined {
    return this.storage.getStore();
  }
}
