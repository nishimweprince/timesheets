export interface AppEnv {
  NODE_ENV: string;
  PORT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_SSL: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL: string;
  INITIAL_ORG_NAME: string;
  INITIAL_ADMIN_EMAIL: string;
  INITIAL_ADMIN_PASSWORD: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_UPLOAD_FOLDER: string;
  CORS_ORIGINS: string;
  RESEND_API_KEY: string;
  APP_URL: string;
  FROM_EMAIL: string;
}

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const env = {
    NODE_ENV: stringValue(config.NODE_ENV, 'development'),
    PORT: numberValue(config.PORT, 3000),
    DATABASE_HOST: stringValue(config.DATABASE_HOST, 'localhost'),
    DATABASE_PORT: numberValue(config.DATABASE_PORT, 5432),
    DATABASE_USER: stringValue(config.DATABASE_USER, 'timesheets'),
    DATABASE_PASSWORD: stringValue(config.DATABASE_PASSWORD, 'timesheets'),
    DATABASE_NAME: stringValue(config.DATABASE_NAME, 'timesheets'),
    DATABASE_SSL: booleanValue(config.DATABASE_SSL, false),
    JWT_ACCESS_SECRET: stringValue(config.JWT_ACCESS_SECRET, 'development-access-secret-change-me'),
    JWT_REFRESH_SECRET: stringValue(config.JWT_REFRESH_SECRET, 'development-refresh-secret-change-me'),
    JWT_ACCESS_TTL: stringValue(config.JWT_ACCESS_TTL, '15m'),
    JWT_REFRESH_TTL: stringValue(config.JWT_REFRESH_TTL, '30d'),
    INITIAL_ORG_NAME: stringValue(config.INITIAL_ORG_NAME, 'Tuza Health'),
    INITIAL_ADMIN_EMAIL: stringValue(config.INITIAL_ADMIN_EMAIL, 'admin@tuza.local'),
    INITIAL_ADMIN_PASSWORD: stringValue(config.INITIAL_ADMIN_PASSWORD, 'ChangeMe123!'),
    CLOUDINARY_CLOUD_NAME: stringValue(config.CLOUDINARY_CLOUD_NAME, ''),
    CLOUDINARY_API_KEY: stringValue(config.CLOUDINARY_API_KEY, ''),
    CLOUDINARY_API_SECRET: stringValue(config.CLOUDINARY_API_SECRET, ''),
    CLOUDINARY_UPLOAD_FOLDER: stringValue(config.CLOUDINARY_UPLOAD_FOLDER, 'timesheets/evidence'),
    CORS_ORIGINS: stringValue(config.CORS_ORIGINS, 'http://localhost:5173'),
    RESEND_API_KEY: stringValue(config.RESEND_API_KEY, ''),
    APP_URL: stringValue(config.APP_URL, 'http://localhost:5173'),
    FROM_EMAIL: stringValue(config.FROM_EMAIL, 'noreply@tuzahealth.com')
  };

  if (env.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (env[key].includes('development') || env[key].length < 32) {
        throw new Error(`${key} must be a strong production secret`);
      }
    }
  }

  return env;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}
