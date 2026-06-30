import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Response } from 'express';
import { AuditContextService } from './audit-context.service';
import { AuditLayer } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditContext: AuditContextService,
    private readonly auditService: AuditService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return this.auditContext.run(
      {
        correlationId: request.correlationId ?? null,
        organizationId: request.user?.organizationId ?? null,
        userId: request.user?.userId ?? null,
        ip: request.ip ?? null,
        userAgent: request.header('user-agent') ?? null,
        httpMethod: request.method,
        httpPath: request.path,
        requestStartedAt: startedAt
      },
      () =>
        next.handle().pipe(
          catchError((error) => throwError(() => error)),
          finalize(() => {
            if (!MUTATION_METHODS.has(request.method)) return;
            void this.auditService.record({
              action: `http.${request.method.toLowerCase()}`,
              layer: AuditLayer.HTTP,
              correlationId: request.correlationId ?? null,
              organizationId: request.user?.organizationId ?? null,
              actorId: request.user?.userId ?? null,
              httpMethod: request.method,
              httpPath: request.path,
              httpStatus: response.statusCode,
              durationMs: Date.now() - startedAt,
              ip: request.ip ?? null,
              userAgent: request.header('user-agent') ?? null,
              bodySnapshot: request.body as Record<string, unknown>,
              querySnapshot: request.query as Record<string, unknown>
            });
          })
        )
    );
  }
}
