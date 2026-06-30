# Timesheets Server

NestJS backend for the timesheets and attendance MVP.

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run start:dev
```

The API is served under `/api/v1`.

This project intentionally uses TypeORM `synchronize: true` for immediate schema changes during early product development. There are no migrations in this backend yet.
