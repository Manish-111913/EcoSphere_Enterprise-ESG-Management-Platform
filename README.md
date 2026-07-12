# EcoSphere

This repo has two separate apps:

- `BACKEND` - NestJS + Prisma + PostgreSQL
- `FRONTEND` - React + Vite

There is no root `package.json`, so run the frontend and backend from their own folders in separate terminals.

## Prerequisites

- Node.js 20+
- Docker Desktop running

## 1. Start PostgreSQL in Docker

If you have not created the database container yet, run:

```powershell
docker run -d --name ecosphere-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=ecosphere -p 5433:5432 postgres:16
```

If the container already exists and is stopped, run:

```powershell
docker start ecosphere-db
```

## 2. Run the backend

Open a terminal in `BACKEND`:

```powershell
cd D:\ECOSPHERE\BACKEND
```

If `.env` does not exist, create it from the example:

```powershell
Copy-Item .env.example .env
```

Install dependencies and prepare the database:

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Start the backend:

```powershell
npm run start:dev
```

Backend URL:

```text
http://localhost:4000/api/v1
```

Health check:

```text
http://localhost:4000/api/v1/health
```

Default backend env values from `BACKEND/.env.example`:

```env
DATABASE_URL=postgresql://postgres:dev@localhost:5433/ecosphere
JWT_SECRET=change-me
PORT=4000
```

## 3. Run the frontend

Open a second terminal in `FRONTEND`:

```powershell
cd D:\ECOSPHERE\FRONTEND
```

Install dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Frontend API connection

The frontend already falls back to:

```text
http://localhost:4000/api/v1
```

So in local development it should work without extra config.

If you want to set it explicitly, create `FRONTEND/.env.local` with:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

## Run both together

Use two terminals:

1. `BACKEND` -> `npm run start:dev`
2. `FRONTEND` -> `npm run dev`

Then open `http://localhost:3000` in the browser.

## Notes

- The backend uses port `4000`.
- The frontend uses port `3000`.
- PostgreSQL runs in Docker on host port `5433`.
- `npm run seed` is useful for loading demo data after migrations.
