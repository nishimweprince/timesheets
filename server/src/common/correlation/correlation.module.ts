import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationMiddleware } from './correlation.middleware';

@Global()
@Module({
  providers: [CorrelationMiddleware],
  exports: [CorrelationMiddleware]
})
export class CorrelationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
