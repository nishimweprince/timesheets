import { Global, Module } from '@nestjs/common';
import { DatabaseBootstrapService } from './database-bootstrap.service';

@Global()
@Module({
  providers: [DatabaseBootstrapService],
  exports: [DatabaseBootstrapService]
})
export class DatabaseModule {}
