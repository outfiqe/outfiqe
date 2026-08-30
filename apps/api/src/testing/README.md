# Testing infra

## Purpose

Shared test harness for `apps/api` — the pieces an integration test needs that aren't specific to
any one module, so they live here instead of being duplicated into every integration test file.

## Structure

- `integration/testApp.ts` — a `createApp()` Express instance for `supertest` to send requests
  against directly (no real server/port needed).
- `integration/authHelpers.ts` — `createAdminSession()`: creates a real admin `User` row and a real
  JWT, for tests that need to hit an admin-only route.
- `integration/workerPool.ts` — the single source of truth for how many parallel integration
  workers there are (`INTEGRATION_WORKER_COUNT`, from `INTEGRATION_WORKERS` or CPU count, capped) and
  how each worker's `poolId` maps to its own Postgres database (`outfiqe_test_db_wN`) and Redis
  logical database (`/N`). Imported by `vitest.config.ts`, `globalSetup.ts`, and `perWorkerEnv.ts`
  so all three agree on the same names.
- `integration/globalSetup.ts` — vitest `globalSetup` for the `integration` project: fails fast if
  `TEST_DATABASE_URL` isn't set, migrates a persistent `outfiqe_test_db_template` database once, then
  clones it into one `outfiqe_test_db_wN` per worker with `CREATE DATABASE ... TEMPLATE` and flushes
  each worker's Redis logical database. Runs exactly once for the whole test run, in vitest's main
  process — not once per test file (see rationale below). Its teardown drops the per-worker clones.
- `integration/perWorkerEnv.ts` — the first `setupFiles` entry, ahead of `setup.ts`: rewrites
  `process.env.DATABASE_URL` and `process.env.REDIS_URL` to this worker's own clone before any app
  module (and therefore `#config/env.config.ts`) is imported.
- `integration/setup.ts` — the second `setupFiles` entry: truncates every table and clears any
  accumulated Redis rate-limit/lockout counters after each test, and disconnects Prisma/Redis after
  the suite. Now operating on this worker's private database and Redis logical database.

Reached from anywhere in `src/` via the `#test/*` subpath import (see `package.json`'s `imports`),
e.g. `import { testApp } from "#test/integration/testApp.js"`.

## Funnel

An integration test (colocated as `<module>.integration.test.ts` next to the module it exercises)
imports `testApp` and, if it needs to be authenticated, `createAdminSession`; `supertest(testApp)`
sends a real HTTP request through the real Express app, middleware, and a real (test) database.
`integration/setup.ts` resets the database between tests so each test starts from a clean slate.

Test files run in parallel across `INTEGRATION_WORKER_COUNT` forked workers. `globalSetup.ts`
provisions one Postgres database and one Redis logical database per worker up front;
`perWorkerEnv.ts` points each worker at its own pair before the app boots, so parallel files never
see each other's rows or Redis keys.

## Non-obvious rationale

- This isn't colocated with a single source file the way `<name>.test.ts` files are: `testApp` and
  `createAdminSession` are reused by every integration test in the app (not just the one module
  that currently has one), and `setup.ts` is wired in as a vitest config-level `setupFiles` entry,
  which has to be a real file path — it can't be attached to one source file.
- Lives under `src/testing/`, not a separate top-level `test/`, specifically so it's colocated at
  the app level (everything under `src/`) even though it isn't colocated at the file level. It's
  excluded from the production build (`tsconfig.json`'s `exclude`) and only type-checked/run as
  part of the `tsconfig.test.json` / `vitest` test projects.
- `authHelpers.ts` sits under `integration/`, not directly in `src/testing/`, because it does real,
  integration-only things (writes a DB row, mints a real JWT) — a unit test should never need it.
- **The integration project used to run strictly serially (`maxWorkers: 1`) because every test
  shared one database; it can now run several workers, each with its own database and Redis logical
  database.** The single shared database _was_ the isolation mechanism — two files running at once
  would `TRUNCATE` each other's rows mid-test — so raising the worker count first required giving
  each worker its own state. `globalSetup.ts` migrates one persistent `outfiqe_test_db_template`
  once and then clones it per worker with `CREATE DATABASE ... TEMPLATE`, which is a file copy on the
  Postgres side (no migration replay per worker), and hands each worker `outfiqe_test_db_wN`.
  Redis is split by logical database (`redis://…/N`) rather than key prefix so no app code has to
  know it's under test — this also stops one worker's IP-keyed rate-limit counter from returning
  429s to another worker's test. `DATABASE_POOL_MAX` (`.env.test`, and the CI job env) keeps each
  worker's Postgres connection pool small enough that `workers × pool` stays under the server's
  `max_connections`.
- **The default worker count is `floor(logical CPUs / 3)`, not one-per-CPU, and this suite does not
  parallelize on a small machine.** `createApp()` for a test pulls in the full stack — Prisma
  engine, ioredis with a reconnect/backoff strategy, Redis Streams consumers, Sentry — so each
  forked worker is a heavyweight, event-loop-bound process, not a thin handler. On a 2-core box,
  4 workers oversubscribe the CPU so badly that request handlers stall for 30–60s and tests hit
  their timeout; measured, it was slower than serial. `floor(CPUs / 3)` resolves to 1 on a 2-core /
  4-thread machine (unchanged behaviour) and to a useful number only where the cores actually exist.
  `INTEGRATION_WORKERS` overrides it — CI pins `INTEGRATION_WORKERS=2` per job and the real CI
  speed-up is meant to come from sharding across runners, not from stacking workers on one runner.
  The count is also capped at 8 in `workerPool.ts` — Redis only has 16 logical databases, and past
  a point the shared Postgres/Redis instance is the bottleneck anyway.
- **The per-test `TRUNCATE` of every table, hundreds of times, is the suite's dominant cost, and it
  is `fsync`-bound.** The biggest single lever for local speed (serial or parallel) is a test
  Postgres with durability turned off and its data directory on a RAM disk — e.g. a
  `postgres:16-alpine` container run with `-c fsync=off -c synchronous_commit=off -c
full_page_writes=off -c wal_level=minimal` and a `tmpfs` mount at `/var/lib/postgresql/data`, with
  `TEST_DATABASE_URL` pointed at it. This is safe precisely because the data is disposable. CI's
  Postgres service already gets `--tmpfs /var/lib/postgresql/data`; GitHub service containers can't
  take the `-c` flags, so full tuning there needs a `docker run` step instead of a `services:` block.
- **The Prisma migration check moved from `setup.ts`'s `beforeAll` to `globalSetup.ts` because
  `pool: "forks"` gives every integration test file its own process, so a hook in `setupFiles` reruns
  once per file, not once per run.** `pnpm exec prisma migrate deploy` takes real, measurable
  wall-clock time to start (CLI cold start, schema parse, a DB round trip to check migration status)
  even when there's nothing to apply — spending that once per test _file_ rather than once per test
  _run_ was pure waste that scaled with the number of integration test files, not with anything that
  actually changes between them. It now runs against the template database, once, and the per-worker
  clones inherit the result. `vitest.config.ts`'s `globalSetup` array is the one hook vitest
  guarantees runs exactly once, in the orchestrating process, regardless of `pool`/`maxWorkers`/file
  count — the correct place for genuinely run-once setup. `globalSetup` runs _outside_ any project's
  own `env` config, though (it's not a worker), so `globalSetup.ts` re-derives `TEST_DATABASE_URL`
  from `.env.test` itself rather than trusting `process.env.DATABASE_URL` to already be the test
  database — the first version of this fix skipped that and silently ran migrations against the dev
  database instead, caught by checking the actual log output rather than assuming the fix worked.
- **`perWorkerEnv.ts` has to be the first `setupFiles` entry and must not import any app code.**
  `#config/env.config.ts` reads `process.env.DATABASE_URL`/`REDIS_URL` at import time, and
  `setup.ts` pulls in the Prisma and Redis clients transitively — so the rewrite to the per-worker
  clone has to land before that first import. vitest runs `setupFiles` in array order, each fully
  evaluated before the next, and `process.env` mutations persist for the life of the worker process
  across vitest's per-file module-registry resets, so a one-time sentinel (`INTEGRATION_WORKER_ROUTED`)
  keeps the rewrite from compounding (`_w1_w1`) when `setupFiles` re-run for the next file.
- **`vitest.config.ts`'s integration `env` block explicitly overrides `GMAIL_APP_PASSWORD`,
  `ESEWA_SECRET_KEY`, and `KHALTI_SECRET_KEY` to safe sandbox values, and this has to be an explicit
  override, not just omitting them.** `#config/env.config.ts` does `import "dotenv/config"` on every
  import, which loads `apps/api/.env` (the real dev file, with real secrets) as a side effect — and
  dotenv only skips a key it finds _already set_. Simply not passing these keys through from the
  ambient shell env left them unset at the point `vitest.config.ts` runs, so `env.config.ts`'s own
  `dotenv/config` import re-populated them from the real `.env` moments later, inside every test
  worker. Caught live: `sendEmail` (`shared/utils/email.utils.ts`) was making real SMTP calls to
  Gmail using a real account's app password during `auth.integration.test.ts`, each call taking
  several seconds — exactly the kind of external, slow, and non-hermetic dependency an integration
  test should never have. The override values reuse each key's own Zod-schema sandbox default
  (`ESEWA_SECRET_KEY`, `KHALTI_SECRET_KEY`) so they still pass that schema's own validation, or an
  empty string (`GMAIL_APP_PASSWORD`, which is optional and falsy-checked) so `sendEmail` takes its
  existing console-stub fallback path instead of ever constructing a real transporter.
- **`setup.ts` clears `ratelimit:*` and `auth:login-lockout:*` Redis keys after every test, not just
  Postgres tables.** Unlike the database, Redis isn't reset between tests, so an IP-keyed rate
  limiter's counter (unlike an email-keyed one, which naturally gets a fresh key per test since each
  test uses a unique generated email) persists across every test in a file — since `pool: "forks"`
  runs one process per file but all its tests share that process's Redis connection. Left unhandled,
  an early test exhausting an IP-keyed limit would make every later test in the same file that hits
  the same route see 429s instead of the response it actually expects. Scoped to these two key
  patterns rather than a full flush so it doesn't reach into cache/lock/stream keys other tests might
  exercise.
