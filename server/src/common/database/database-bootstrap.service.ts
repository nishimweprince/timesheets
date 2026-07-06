import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.createExtensions();
    await this.createCriticalIndexes();
  }

  private async createExtensions(): Promise<void> {
    for (const extension of ['postgis', 'pgcrypto', 'btree_gist', 'citext']) {
      try {
        await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
      } catch (error) {
        this.logger.warn(`Could not create ${extension} extension: ${(error as Error).message}`);
      }
    }
  }

  private async createCriticalIndexes(): Promise<void> {
    const statements = [
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_work_session_per_employee
       ON work_sessions (organization_id, employee_membership_id)
       WHERE status = 'OPEN'`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_clock_attempt_idempotency
       ON clock_attempts (organization_id, employee_membership_id, action, idempotency_key)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_assignment
       ON shift_assignments (organization_id, employee_membership_id, shift_instance_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_shift_pattern_assignment
       ON shift_pattern_assignments (organization_id, employee_membership_id, pattern_id)
       WHERE status = 'ACTIVE'`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_events_location
       ON attendance_events USING GIST (location_point)`
    ];

    for (const statement of statements) {
      try {
        await this.dataSource.query(statement);
      } catch (error) {
        this.logger.warn(`Could not create bootstrap index: ${(error as Error).message}`);
      }
    }
  }
}
