import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

const bootLogger = new Logger('DatabaseBoot');

// Tables that were replaced by the shift-pattern redesign. On boot we drop them
// before TypeORM sync so the new schema can be created cleanly in dev.
const LEGACY_TABLES_TO_DROP = ['shift_templates'];

export function dataSourceOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DATABASE_HOST'),
    port: config.getOrThrow<number>('DATABASE_PORT'),
    username: config.getOrThrow<string>('DATABASE_USER'),
    password: config.getOrThrow<string>('DATABASE_PASSWORD'),
    database: config.getOrThrow<string>('DATABASE_NAME'),
    ssl: config.get<boolean>('DATABASE_SSL') ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize: true,
    migrationsRun: false,
    uuidExtension: 'pgcrypto',
    namingStrategy: new SnakeNamingStrategy()
  };
}

export const typeOrmAsyncOptions: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: dataSourceOptions,
  dataSourceFactory: async (options) => {
    if (!options) throw new Error('DataSource options are required');
    const prep = new DataSource({ ...(options as DataSourceOptions), synchronize: false });
    await prep.initialize();
    try {
      for (const table of LEGACY_TABLES_TO_DROP) {
        await prep.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
    } catch (err) {
      bootLogger.warn(`Legacy table cleanup failed: ${(err as Error).message}`);
    } finally {
      await prep.destroy();
    }
    const ds = new DataSource(options as DataSourceOptions);
    await ds.initialize();
    return ds;
  }
};
