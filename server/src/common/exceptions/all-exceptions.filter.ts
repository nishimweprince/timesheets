import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };

    const rawMessage = typeof body === 'string' ? body : (body as Record<string, unknown>).message;
    const message: string = Array.isArray(rawMessage)
      ? String((rawMessage as unknown[])[0])
      : String(rawMessage ?? 'An error occurred');

    response
      .status(status)
      .header('X-Message', message.replace(/[\r\n]/g, ' '))
      .json({
        statusCode: status,
        message,
        path: request.url,
        correlationId: request.correlationId,
        error: typeof body === 'string' ? { message: body } : body,
      });
  }
}
