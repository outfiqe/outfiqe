# Testing infra

## Purpose

Shared test harness for `apps/api` — the pieces an integration test needs that aren't specific to
any one module, so they live here instead of being duplicated into every integration test file.

## Structure

- `integration/testApp.ts` — a `createApp()` Express instance for `supertest` to send requests
  against directly (no real server/port needed).
- `integration/authHelpers.ts` — `createAdminSession()`: creates a real admin `User` row and a real
  JWT, for tests that need to hit an admin-only route.
- `integration/globalSetup.ts` — vitest `globalSetup` for the `integration` project: fails fast if
  `TEST_DATABASE_URL` isn't set, then runs pending Prisma migrations against it. Runs exactly once
  for the whole test run, in vitest's main process — not once per test file (see rationale below).
- `integration/setup.ts` — vitest `setupFiles` for the `integration` project: truncates every table
  after each test, and disconnects Prisma/Redis after the suite.

Reached from anywhere in `src/` via the `#test/*` subpath import (see `package.json`'s `imports`),
e.g. `import { testApp } from "#test/integration/testApp.js"`.

## Funnel

An integration test (colocated as `<module>.integration.test.ts` next to the module it exercises)
imports `testApp` and, if it needs to be authenticated, `createAdminSession`; `supertest(testApp)`
sends a real HTTP request through the real Express app, middleware, and a real (test) database.
`integration/setup.ts` resets the database between tests so each test starts from a clean slate.

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
- **The Prisma migration check moved from `setup.ts`'s `beforeAll` to `globalSetup.ts` because
  `pool: "forks"` gives every integration test file its own process, so a hook in `setupFiles` reruns
  once per file, not once per run.** `pnpm exec prisma migrate deploy` takes real, measurable
  wall-clock time to start (CLI cold start, schema parse, a DB round trip to check migration status)
  even when there's nothing to apply — spending that once per test _file_ rather than once per test
  _run_ was pure waste that scaled with the number of integration test files, not with anything that
  actually changes between them. `vitest.config.ts`'s `globalSetup` array is the one hook vitest
  guarantees runs exactly once, in the orchestrating process, regardless of `pool`/`maxWorkers`/file
  count — the correct place for genuinely run-once setup. `globalSetup` runs _outside_ any project's
  own `env` config, though (it's not a worker), so `globalSetup.ts` re-derives `TEST_DATABASE_URL`
  from `.env.test` itself rather than trusting `process.env.DATABASE_URL` to already be the test
  database — the first version of this fix skipped that and silently ran migrations against the dev
  database instead, caught by checking the actual log output rather than assuming the fix worked.
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
