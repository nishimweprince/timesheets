import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulingService } from './scheduling.service';

@Injectable()
export class SchedulingMaterializer {
  private readonly logger = new Logger(SchedulingMaterializer.name);

  constructor(private readonly scheduling: SchedulingService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    this.logger.log('Materializing upcoming shift instances');
    try {
      await this.scheduling.materializeAllActive();
    } catch (err) {
      this.logger.error('Materialization failed', err as Error);
    }
  }
}
