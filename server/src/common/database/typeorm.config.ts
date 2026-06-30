import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

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
