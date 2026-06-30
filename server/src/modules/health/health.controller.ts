import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      database: this.dataSource.isInitialized ? 'up' : 'down',
      timestamp: new Date().toISOString()
    };
  }
}
