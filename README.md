# Feature-Based

A Node.js + React monorepo starter, structured so you can move fast for the MVP
and split pieces into microservices later **without a rewrite**.

## Stack (versions)

- **Monorepo:** pnpm 11 workspaces + Turborepo 2.10
- **Language:** TypeScript 7 (the native/Go compiler)
- **API:** Node 22+, Express 5, Zod 4
- **Database:** PostgreSQL 16 + Prisma 7
- **Web:** React 19, Vite 8, React Router 7, TanStack Query 5

## Structure

```

├── apps/
│   ├── api/                    # Express API — a "modular monolith"
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # data model
│   │   │   ├── migrations/     # committed SQL migrations
│   │   │   └── seed.ts
│   │   ├── prisma.config.ts    # Prisma 7 CLI config (replaces schema config)
│   │   └── src/
│   │       ├── modules/        # one folder per business domain
│   │       │   ├── users/      # routes → validate → controller → service → repository
│   │       │   └── auth/
│   │       ├── shared/         # errors, validation, event bus, hashing, db
│   │       └── config/
│   └── web/                    # React app
│       └── src/
│           ├── features/       # one folder per feature (mirrors API modules)
│           │   ├── auth/       # api/ hooks/ components/ types/ index.ts
│           │   └── users/
│           ├── shared/         # apiClient, shared UI, shared hooks
│           └── routes/         # thin routing, composes features
├── packages/
│   └── shared-types/           # types shared between api and web
├── docker-compose.yml          # local Postgres
└── turbo.json
```

## Getting started

```bash
# 1. Install deps (pnpm 11: npm i -g pnpm)
pnpm install

# 2. Env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start Postgres
docker compose up -d

# 4. Create the schema, generate the client, seed a demo user
cd apps/api
pnpm db:migrate      # applies prisma/migrations
pnpm db:generate     # generates the client into src/generated/prisma
pnpm db:seed         # optional: demo@example.com / demo-password-123
cd ../..

# 5. Run everything (api on :4000, web on :5173)
pnpm dev
```

> **`pnpm db:generate` is required before the first typecheck or build.**
> Prisma 7 generates the client into `src/generated/prisma` (not
> `node_modules`), so that directory doesn't exist on a fresh clone and `tsc`
> will report a missing module until you generate. `turbo.json` wires
> `db:generate` as a dependency of `dev`, `build`, and `typecheck`, so the
> root-level `pnpm dev` / `pnpm build` handle it for you.

### Database scripts (`apps/api`)

| Script | What it does |
| --- | --- |
| `pnpm db:migrate` | Create + apply a migration in dev |
| `pnpm db:deploy` | Apply existing migrations (CI/production) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:seed` | Run `prisma/seed.ts` |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Drop and re-migrate (destructive) |

## Environment variables

Three `.env.example` files, each scoped to what needs it:

- **`.env`** (root) — Postgres credentials consumed by `docker-compose.yml`.
- **`apps/api/.env`** — `DATABASE_URL`, `JWT_SECRET`, token TTLs. Validated by
  Zod at boot (`src/config/env.ts`), so a missing or too-short secret fails
  immediately with a readable message instead of at 3am.
- **`apps/web/.env`** — `VITE_API_URL` only. **Anything in this file ships to
  the browser**, so it must never hold secrets. Leave it empty in dev to use
  Vite's proxy; set a full origin when the API deploys separately.

`.gitignore` commits only `.env.example` files, never `.env`.

## Why this structure, specifically for "might go microservices later"

This is a **modular monolith**: one deployable API, internally split into
self-contained modules that behave like they're already separate services.

1. **Each module is a vertical slice.** `modules/users` owns its own routes,
   schemas, controller, service, and repository.
2. **Only the repository touches Prisma.** Services and controllers use
   hand-written types (`user.types.ts`), never generated Prisma types — so
   swapping the datastore, or extracting a users service with its own
   database, is contained to one file.
3. **Cross-module side effects go through an event bus**
   (`shared/events/eventBus.ts`), not direct calls. `users` emits
   `user.created`; anything that cares subscribes. When you extract a module,
   swap the in-process `EventEmitter` for a real broker (SQS, RabbitMQ, Kafka)
   and the emit/on call sites don't change.
4. **The frontend mirrors the backend's boundaries.** `features/users` only
   talks to `/api/users` through its own `api/` file, so repointing it at a
   new service URL is a one-line change.
5. **`packages/shared-types` is the contract layer** both sides depend on.

**When you actually split a module out:** copy `modules/users` into its own
`apps/users-service` with its own `package.json`, `schema.prisma`, and
Dockerfile; replace event bus calls with real messaging; turn
`app.use("/api/users", ...)` into a proxy route. Because the module was
already isolated, this is mechanical, not a redesign.

## Notes on the current major versions

These bit during setup and are worth knowing:

- **Express 5** forwards rejected promises from handlers to error middleware
  automatically. There's no `asyncHandler` wrapper here — you don't need one.
- **Prisma 7** removed the Rust engine. A **driver adapter is now mandatory**
  (`@prisma/adapter-pg` + `pg`), the generator is `prisma-client` (not
  `prisma-client-js`), `output` is **required**, config moved to
  `prisma.config.ts`, `.env` is **not** auto-loaded, and `migrate` no longer
  auto-runs `generate` or seeding.
- **Prisma 7 connection pooling changed.** It uses `pg`'s defaults now, which
  include *no* connection timeout. `src/shared/db/prisma.ts` sets explicit
  `max` / `connectionTimeoutMillis` / `idleTimeoutMillis` for this reason.
- **TypeScript 7** removed `baseUrl`; path aliases use `"@/*": ["./src/*"]`.
- **Vite 8** requires Node 20.19+/22.12+ and rejects `__dirname` in config —
  use `import.meta.dirname`.
- **React Router 7** — import from `react-router`, not `react-router-dom`.
- **Zod 4** — `z.email()` / `z.uuid()` replace `z.string().email()`.
- **pnpm 11** blocks dependency postinstall scripts by default and quarantines
  packages published in the last ~24h. Both are configured explicitly in
  `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAgeExclude`).

## Verification status — please read

Not everything here could be executed in the environment I built it in.

**Verified by actually running it:**

- All package versions checked against the npm registry.
- `apps/api` and `apps/web` typecheck clean under TypeScript 7.
- `apps/web` builds with Vite 8 (React 19); the compiled API `dist/` boots and
  serves requests.
- Full API request suite: 201 create, 422 validation with field detail, 409
  duplicate, 200 login with token, 401 wrong password. Password hashes never
  appear in a response.
- Express 5's automatic async-error forwarding (tested directly — that's how I
  concluded `asyncHandler` was dead code).
- **`prisma/migrations/…/migration.sql` applied to a real PostgreSQL 16**:
  correct column types, primary key, and a working unique constraint on
  `email`.
- `prisma.config.ts` loads successfully via the Prisma CLI.

**Not verified — Prisma's engine CDN was firewalled in my sandbox:**

- `prisma generate`, `prisma migrate dev`, and `prisma validate` could not
  run. The generated client, and the repository code importing it, are written
  to the official Prisma 7 docs rather than executed.
- **First thing to do on your machine:** run `pnpm db:generate` in `apps/api`,
  then `pnpm typecheck`. If the import path in `src/shared/db/prisma.ts`
  doesn't match what Prisma emits, that's the one line to adjust.
- The committed migration is hand-written to match `schema.prisma`. Run
  `pnpm db:migrate` and confirm Prisma reports no drift; if it wants to create
  a migration, delete `prisma/migrations/20260807000000_init` and let it
  generate its own.

## What's real vs. what's left for you

**Real and working:**

- Zod validation on every request body and route param, returning 422 with
  per-field details.
- Password hashing via Node's built-in `scrypt` with constant-time compare
  (`shared/utils/password.ts`) — no native dependency to compile.
- Login returns an identical error for unknown email and wrong password, so
  the endpoint can't be used to enumerate registered accounts.
- Consistent error envelope (`{ message, code, details }`).
- Graceful shutdown that closes the DB pool on SIGINT/SIGTERM.

**Deliberately left for you:**

- **Auth hardening:** JWTs are signed, but there's no refresh-token store,
  rotation, or `requireAuth` middleware yet. Add these before real users.
- **Testing:** no runner wired up. Vitest is the natural fit.
- **CI:** `turbo run typecheck build` plus `pnpm db:deploy` is the first
  pipeline to write.

## Adding a new feature/module

**Backend:** add the model to `schema.prisma`, run `pnpm db:migrate`, then
create `apps/api/src/modules/<name>/` with `.routes` / `.schemas` /
`.controller` / `.service` / `.repository` / `.types`, and mount the router in
`app.ts`.

**Frontend:** create `apps/web/src/features/<name>/` with `api/`, `hooks/`,
`components/`, `types/`, and an `index.ts` exporting only the public surface.
