# Feature-Based Outfiqe Web

A Node.js + React monorepo starter, structured so you can move fast for the MVP
and split pieces into microservices later **without a rewrite**.
# Outfiqe

Node.js + React monorepo, structured as a modular monolith so it can move fast now and split into separate services later without a rewrite.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** Node 22, Express 5, Zod, Prisma 7 + PostgreSQL 16
- **Web:** React 19, Vite, React Router, TanStack Query
- **Language:** TypeScript

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start Postgres
docker compose up -d

# 4. Set up the database
pnpm --filter @outfiqe/api db:generate   # generate the Prisma client
pnpm --filter @outfiqe/api db:migrate    # create/apply schema
pnpm --filter @outfiqe/api db:seed       # optional demo user

# 5. Run the app
pnpm dev
```

- API: [http://localhost:4000](http://localhost:4000)
- Web: [http://localhost:5173](http://localhost:5173)

## Project Structure

```
apps/
  api/            Express API (modular monolith — one folder per domain)
  web/            React app (features mirror the API's modules)
packages/
  shared-types/   Types shared between api and web
docker-compose.yml  Local Postgres
```

## Database Scripts

Run from `apps/api` (or via `pnpm --filter @outfiqe/api <script>`):

| Script | Purpose |
| --- | --- |
| `db:migrate` | Create + apply a migration (dev) |
| `db:deploy` | Apply existing migrations (CI/production) |
| `db:generate` | Regenerate the Prisma client |
| `db:seed` | Seed demo data |
| `db:studio` | Browse the database in Prisma Studio |

## Environment Variables

| File | Used by | Notes |
| --- | --- | --- |
| `.env` | `docker-compose.yml` | Postgres credentials |
| `apps/api/.env` | API | `DATABASE_URL`, `JWT_SECRET`, token TTLs |
| `apps/web/.env` | Web | `VITE_API_URL` only — ships to the browser, no secrets |

`.env` files are gitignored; only the `.env.example` templates are committed.

## Status

MVP — auth is functional (signup/login, hashed passwords, JWT) but has no refresh-token store or `requireAuth` middleware yet, and there's no test suite wired up. Not production-ready.
