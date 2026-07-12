# EcoSphere — Backend

NestJS + PostgreSQL backend for the EcoSphere Enterprise ESG Management Platform.
See `../10_EcoSphere_Backend_COMPLETE (2).md` for the full specification.

## Status

**Phase B0 — foundation complete.** In place:

- **Stack:** NestJS + TypeScript + PostgreSQL via **Prisma**.
- **Schema:** all 48 tables from spec §A3.1–A3.4 with UUID PKs, soft-delete +
  audit columns, snake_case mapping, lookup-driven statuses, and DB-level
  constraints (24 CHECKs incl. weights=100, stock≥0, factor>0, scores 0–100,
  xp-ledger idempotency, badge-award race guard; 68 FKs with RESTRICT/CASCADE
  per §A5).
- **Core layer:** DB-backed `AppConfigService` (in-memory cache + `config.updated`
  bust), in-process `EventBus`, standard response envelope, global exception
  filter (§A10 error taxonomy), correlation-id middleware + request logging, and
  an audit-log interceptor on every mutation.
- **Seed:** idempotent `npm run seed` producing the exact §A11 dataset
  (6 depts, 25 users, 60 carbon txns, 10 challenges across all 5 states,
  8 badges, 6 rewards incl. stock-0/stock-2, 12 issues with exactly 3 overdue,
  full lookups/transitions/settings/weights/scoring/approval/notification config
  and the complete role→permission matrix from §A9).
- **Health:** `GET /api/v1/health` → `{status, db, version}`.

Domain modules (auth, environmental, social, governance, gamification, scoring, …)
are scaffolded as folders and built in later phases (B1+).

## Prerequisites

- Node 20+
- Docker Desktop (Postgres runs in a container; the app runs directly via npm)

## Database (Docker)

```bash
# host port 5433 avoids clashing with a native Postgres often already on 5432
docker run -d --name ecosphere-db \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=ecosphere \
  -p 5433:5432 postgres:16
# after a restart:
docker start ecosphere-db
```

## Run

```bash
cp .env.example .env       # adjust if needed (infra only — no business config)
npm install
npm run prisma:generate    # generate the Prisma client
npm run prisma:migrate     # apply migrations (prisma migrate deploy)
npm run seed               # load the §A11 demo dataset (idempotent)
npm run start:dev          # boots on http://localhost:4000/api/v1
```

## Smoke check

```bash
curl http://localhost:4000/api/v1/health
# -> {"success":true,"data":{"status":"ok","db":"up","version":"0.1.0"},"error":null,"meta":null}
```

## Conventions

- Base path `/api/v1`; every response uses the envelope `{ success, data, error, meta }`.
- `.env` holds infra config ONLY (`DATABASE_URL`, `JWT_SECRET`, `PORT`). All
  business configuration is data-driven in the database (`app_settings`).
- Schema is managed with explicit TypeORM migrations — `synchronize` is never on.
- Port 4000 is deliberate (frontend takes 3000 locally).
